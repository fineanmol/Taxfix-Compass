import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, FileUp, CheckCircle2, AlertTriangle, Landmark, Receipt } from "lucide-react";
import dayjs from "dayjs";
import { CategoryIcon } from "@/components/CategoryIcon";
import { useAccounts, useCategories } from "@/hooks/useData";
import { useSettings } from "@/store/useSettings";
import { formatMoney } from "@/lib/money";
import {
  parseOfx,
  parseCsvGrid,
  mapCsvRows,
  detectFormat,
  type CsvMapping,
  type ParsedRow,
} from "@/lib/statement";
import { buildPreview, commitImport, type ImportPreviewRow, type SkipReason } from "@/lib/importer";
import {
  looksLikeGermanPayslip,
  parseGermanPayslip,
  gridToPayslipLines,
  mockGermanPayslipLines,
} from "@/lib/payslip";

function skipLabel(reason: SkipReason): string {
  switch (reason) {
    case "already-imported":
      return "Already imported";
    case "duplicate-in-file":
      return "Duplicate in file";
    case "no-category":
      return "No category";
  }
}

type Step = "pick" | "map" | "preview" | "done";
type ImportKind = "bank" | "payslip";

export default function ImportStatement() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const accounts = useAccounts();
  const categories = useCategories();
  const settings = useSettings((s) => s.settings);

  const [step, setStep] = useState<Step>("pick");
  const [kind, setKind] = useState<ImportKind>(params.get("kind") === "payslip" ? "payslip" : "bank");
  const [accountId, setAccountId] = useState("");
  const [csvGrid, setCsvGrid] = useState<{ header: string[]; rows: string[][] } | null>(null);
  const [mapping, setMapping] = useState<CsvMapping>({ dateCol: 0, amountCol: 1, descCol: 2 });
  const [preview, setPreview] = useState<ImportPreviewRow[]>([]);
  const [imported, setImported] = useState(0);

  if (!accountId && accounts.length) setAccountId(accounts[0].id);
  // imported transactions inherit the target account's currency (falling back
  // to the app's default currency), not a hardcoded one
  const currency =
    accounts.find((a) => a.id === accountId)?.currency ?? settings?.currency ?? "USD";

  const [busy, setBusy] = useState(false);
  const [warn, setWarn] = useState("");

  async function previewPayslip(lines: string[]) {
    const parsed = parseGermanPayslip(lines);
    if (parsed.rows.length === 0) {
      setWarn(
        "Couldn't find net pay or deductions on this payslip. It may be a scan without a text layer, or an unusual layout."
      );
      return;
    }
    await goPreview(parsed.rows);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setWarn("");

    // PDF: extract text client-side, parse heuristically
    if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") {
      setBusy(true);
      try {
        // lazy-load pdf.js only when a PDF is actually picked (keeps app light)
        const { extractPdfLines, parsePdfLines } = await import("@/lib/pdf");
        const buf = await file.arrayBuffer();
        const lines = await extractPdfLines(buf);
        const blob = lines.join("\n");
        if (kind === "payslip" || looksLikeGermanPayslip(blob)) {
          await previewPayslip(lines);
        } else {
          const { rows, matchedLines } = parsePdfLines(lines);
          if (matchedLines === 0) {
            setWarn(
              "Couldn't find transactions in this PDF. It may be a scanned/image statement (no text layer), or an unusual layout. Try the CSV/OFX export from your bank instead."
            );
          } else {
            await goPreview(rows);
          }
        }
      } catch {
        setWarn("Couldn't read this PDF. If it's password-protected, remove the password and retry.");
      } finally {
        setBusy(false);
      }
      return;
    }

    // Excel: payslip uses the raw grid; bank statements reuse CSV column mapping
    if (/\.(xlsx|xls)$/i.test(file.name) || /sheet|excel/i.test(file.type)) {
      setBusy(true);
      try {
        const [{ parseXlsxRawGrid, gridFromRows }, XLSX] = await Promise.all([
          import("@/lib/statement"),
          import("xlsx"),
        ]);
        const buf = await file.arrayBuffer();
        const rawGrid = parseXlsxRawGrid(buf, XLSX);
        const rawText = rawGrid.flat().join(" ");
        if (kind === "payslip" || looksLikeGermanPayslip(rawText)) {
          await previewPayslip(gridToPayslipLines(rawGrid));
        } else {
          const grid = gridFromRows(rawGrid);
          if (grid.rows.length === 0) {
            setWarn("No rows found in this spreadsheet. Check it's the statement sheet, not a summary tab.");
          } else {
            setCsvGrid(grid);
            setMapping(guessMapping(grid.header));
            setStep("map");
          }
        }
      } catch {
        setWarn("Couldn't read this spreadsheet. Try exporting it as CSV instead.");
      } finally {
        setBusy(false);
      }
      return;
    }

    const text = await file.text();
    if (kind === "payslip" || looksLikeGermanPayslip(text)) {
      const grid = parseCsvGrid(text);
      const lines = gridToPayslipLines([grid.header, ...grid.rows]);
      await previewPayslip(lines.length ? lines : text.split(/\r?\n/));
      return;
    }
    if (detectFormat(file.name, text) === "ofx") {
      await goPreview(parseOfx(text));
    } else {
      const grid = parseCsvGrid(text);
      setCsvGrid(grid);
      setMapping(guessMapping(grid.header));
      setStep("map");
    }
  }

  async function goPreview(rows: ParsedRow[]) {
    const p = await buildPreview(rows, accountId);
    setPreview(p);
    setStep("preview");
  }

  const importable = useMemo(() => preview.filter((r) => !r.duplicate), [preview]);
  const dupes = preview.length - importable.length;
  const skipCounts = useMemo(
    () => ({
      alreadyImported: preview.filter((r) => r.skipReason === "already-imported").length,
      duplicateInFile: preview.filter((r) => r.skipReason === "duplicate-in-file").length,
      noCategory: preview.filter((r) => r.skipReason === "no-category").length,
    }),
    [preview]
  );

  async function confirm() {
    const n = await commitImport(importable, accountId, currency);
    setImported(n);
    setStep("done");
  }

  return (
    <div className="safe-top space-y-4 px-4 pt-4">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-surface shadow-card">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-2xl font-bold tracking-tight text-content">
          {kind === "payslip" ? "Import payslip" : "Import statement"}
        </h1>
      </div>

      {/* account target (shared across steps) */}
      {step !== "done" && accounts.length > 1 && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted">Import into account</p>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="input">
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency})
              </option>
            ))}
          </select>
        </div>
      )}
      {/* single account: no picker needed — just say where it goes */}
      {step !== "done" && accounts.length === 1 && (
        <p className="text-sm text-muted">
          Importing into <span className="font-semibold text-content">{accounts[0].name}</span>
          {accounts[0].currency !== (settings?.currency ?? accounts[0].currency) && (
            <span className="text-faint"> · {accounts[0].currency}</span>
          )}
        </p>
      )}

      {step === "pick" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setKind("bank")}
              className={`card flex flex-col items-start gap-1 p-3 text-left ${
                kind === "bank" ? "ring-2 ring-brand-600" : ""
              }`}
            >
              <Landmark size={18} className="text-brand-600" />
              <span className="text-sm font-semibold text-content">Bank / card</span>
              <span className="text-[11px] leading-snug text-faint">Excel, PDF, CSV, OFX</span>
            </button>
            <button
              type="button"
              onClick={() => setKind("payslip")}
              className={`card flex flex-col items-start gap-1 p-3 text-left ${
                kind === "payslip" ? "ring-2 ring-brand-600" : ""
              }`}
            >
              <Receipt size={18} className="text-brand-600" />
              <span className="text-sm font-semibold text-content">German payslip</span>
              <span className="text-[11px] leading-snug text-faint">Gehaltsabrechnung PDF/Excel</span>
            </button>
          </div>

          <label className="card flex cursor-pointer flex-col items-center gap-2 border border-dashed border-line p-8 text-center">
            {busy ? (
              <>
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
                <span className="font-semibold text-content">Reading file…</span>
              </>
            ) : (
              <>
                <FileUp size={30} className="text-brand-600" />
                <span className="font-semibold text-content">
                  {kind === "payslip" ? "Choose a payslip file" : "Choose a statement file"}
                </span>
                <span className="text-sm text-faint">
                  {kind === "payslip"
                    ? "PDF or Excel Entgelt-/Gehaltsabrechnung"
                    : "PDF, Excel, CSV, or OFX/QFX from your bank or card"}
                </span>
              </>
            )}
            <input
              type="file"
              accept=".pdf,.xlsx,.xls,.ofx,.qfx,.csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              onChange={onFile}
              disabled={busy}
              className="hidden"
            />
          </label>

          {kind === "payslip" && (
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setWarn("");
                await previewPayslip(mockGermanPayslipLines());
              }}
              className="w-full rounded-xl border border-line px-4 py-3 text-sm font-semibold text-muted"
            >
              Try sample German payslip
            </button>
          )}

          {warn && (
            <div className="flex gap-2 rounded-xl bg-red-500/10 p-3 text-sm text-red-500">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <span>{warn}</span>
            </div>
          )}

          <div className="rounded-xl bg-surface-2 p-3 text-xs leading-relaxed text-faint">
            <p className="mb-1 font-medium text-muted">How it works</p>
            {kind === "payslip" ? (
              <p>
                Parses a German <b>Gehalts-/Entgeltabrechnung</b> on your device. It pulls net pay
                (Auszahlung) as income and employee deductions (Lohnsteuer, Soli, KV/RV/AV/PV) as
                expenses. Employer (AG) shares are ignored. Layouts vary — review the preview before
                importing. Scanned PDFs without a text layer can't be read.
              </p>
            ) : (
              <p>
                Works with <b>text-based PDF</b> statements (most banks &amp; cards), plus{" "}
                <b>Excel</b> (.xlsx/.xls), CSV, and OFX/QFX. Everything is parsed{" "}
                <b>on your device</b> — nothing is uploaded. PDF and spreadsheet layouts vary, so
                review the parsed rows before importing. Scanned/photo statements without a text
                layer can't be read; use the CSV/OFX export instead.
              </p>
            )}
          </div>
        </div>
      )}

      {step === "map" && csvGrid && (
        <MapStep
          grid={csvGrid}
          mapping={mapping}
          setMapping={setMapping}
          onBack={() => setStep("pick")}
          onNext={() => goPreview(mapCsvRows(csvGrid.rows, mapping))}
        />
      )}

      {step === "preview" && (
        <div className="space-y-3">
          <div className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-content">
                <b>{importable.length}</b> to import
              </span>
              {dupes > 0 && (
                <span className="flex items-center gap-1 text-faint">
                  <AlertTriangle size={14} /> {dupes} skipped
                </span>
              )}
            </div>
            {/* breakdown of why rows are skipped */}
            {dupes > 0 && (
              <ul className="mt-1 space-y-0.5 text-xs text-faint">
                {skipCounts.alreadyImported > 0 && (
                  <li>• {skipCounts.alreadyImported} already imported before</li>
                )}
                {skipCounts.duplicateInFile > 0 && (
                  <li>• {skipCounts.duplicateInFile} repeated within this file</li>
                )}
                {skipCounts.noCategory > 0 && (
                  <li>• {skipCounts.noCategory} couldn't match a category</li>
                )}
              </ul>
            )}
          </div>

          <div className="card divide-y divide-line p-1">
            {preview.slice(0, 100).map((r, i) => {
              const cat = categories.find((c) => c.id === r.categoryId);
              return (
                <div key={i} className={`flex items-center gap-3 px-3 py-2.5 ${r.duplicate ? "opacity-40" : ""}`}>
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: (cat?.color ?? "#888") + "22", color: cat?.color }}
                  >
                    <CategoryIcon name={cat?.icon ?? "Circle"} size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-content">{r.description}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-faint">{dayjs(r.date).format("MMM D")}</span>
                      {r.skipReason ? (
                        <span className="rounded-md bg-red-500/15 px-1.5 py-0.5 text-[11px] font-medium text-red-500">
                          {skipLabel(r.skipReason)}
                        </span>
                      ) : (
                        /* editable category */
                        <select
                          value={r.categoryId}
                          onChange={(e) => {
                            const v = e.target.value;
                            setPreview((prev) => prev.map((x, xi) => (xi === i ? { ...x, categoryId: v } : x)));
                          }}
                          className="rounded-md bg-surface-2 px-1 py-0.5 text-xs text-muted outline-none"
                        >
                          {categories
                            .filter((c) => c.type === r.type)
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                        </select>
                      )}
                    </div>
                  </div>
                  <span className={`shrink-0 text-sm font-semibold ${r.type === "income" ? "text-mint" : "text-content"}`}>
                    {r.type === "income" ? "+" : "−"}
                    {formatMoney(r.amount, currency)}
                  </span>
                </div>
              );
            })}
            {preview.length > 100 && (
              <p className="px-3 py-2 text-center text-xs text-faint">
                +{preview.length - 100} more (all will import)
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={() => setStep("pick")} className="rounded-xl border border-line px-5 py-3 font-semibold text-muted">
              Back
            </button>
            <button onClick={confirm} disabled={importable.length === 0} className="btn-primary flex-1 disabled:opacity-40">
              Import {importable.length}
            </button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="flex flex-col items-center gap-4 py-14 text-center">
          <CheckCircle2 size={56} className="text-mint" />
          <p className="text-xl font-bold text-content">Imported {imported} transactions</p>
          <div className="flex gap-2">
            <button onClick={() => setStep("pick")} className="rounded-xl border border-line px-5 py-3 font-semibold text-muted">
              Import another
            </button>
            <button onClick={() => navigate("/transactions")} className="btn-primary px-5">
              View transactions
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MapStep({
  grid,
  mapping,
  setMapping,
  onBack,
  onNext,
}: {
  grid: { header: string[]; rows: string[][] };
  mapping: CsvMapping;
  setMapping: (m: CsvMapping) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const colOptions = grid.header.map((h, i) => ({ value: i, label: h || `Column ${i + 1}` }));
  const [splitCols, setSplitCols] = useState(
    mapping.debitCol !== undefined || mapping.creditCol !== undefined
  );

  const set = (patch: Partial<CsvMapping>) => setMapping({ ...mapping, ...patch });

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Match your file's columns:</p>

      <Field label="Date column">
        <ColSelect value={mapping.dateCol} onChange={(v) => set({ dateCol: v })} options={colOptions} />
      </Field>
      <Field label="Description column">
        <ColSelect value={mapping.descCol} onChange={(v) => set({ descCol: v })} options={colOptions} />
      </Field>

      <label className="flex items-center gap-2 py-1 text-sm text-muted">
        <input
          type="checkbox"
          checked={splitCols}
          onChange={(e) => {
            setSplitCols(e.target.checked);
            if (!e.target.checked) set({ debitCol: undefined, creditCol: undefined });
          }}
        />
        My file has separate debit &amp; credit columns
      </label>

      {splitCols ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Debit (money out)">
            <ColSelect value={mapping.debitCol ?? 0} onChange={(v) => set({ debitCol: v })} options={colOptions} />
          </Field>
          <Field label="Credit (money in)">
            <ColSelect value={mapping.creditCol ?? 0} onChange={(v) => set({ creditCol: v })} options={colOptions} />
          </Field>
        </div>
      ) : (
        <>
          <Field label="Amount column">
            <ColSelect value={mapping.amountCol} onChange={(v) => set({ amountCol: v })} options={colOptions} />
          </Field>
          <label className="flex items-center gap-2 py-1 text-sm text-muted">
            <input
              type="checkbox"
              checked={!!mapping.positiveIsExpense}
              onChange={(e) => set({ positiveIsExpense: e.target.checked })}
            />
            Positive numbers are expenses (not income)
          </label>
        </>
      )}

      <Field label="Date format (if dates look wrong)">
        <select
          value={mapping.dateFormat ?? ""}
          onChange={(e) => set({ dateFormat: e.target.value || undefined })}
          className="input"
        >
          <option value="">Auto-detect</option>
          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          <option value="DD-MM-YYYY">DD-MM-YYYY</option>
          <option value="DD.MM.YYYY">DD.MM.YYYY</option>
        </select>
      </Field>

      {/* sample preview of first row */}
      {grid.rows[0] && (
        <div className="rounded-xl bg-surface-2 p-3 text-xs text-faint">
          <p className="mb-1 font-medium text-muted">First row preview</p>
          <p>Date: {grid.rows[0][mapping.dateCol]}</p>
          <p>Desc: {grid.rows[0][mapping.descCol]}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={onBack} className="rounded-xl border border-line px-5 py-3 font-semibold text-muted">
          Back
        </button>
        <button onClick={onNext} className="btn-primary flex-1">
          Preview
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

function ColSelect({
  value,
  onChange,
  options,
}: {
  value: number;
  onChange: (v: number) => void;
  options: { value: number; label: string }[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="input">
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function guessMapping(header: string[]): CsvMapping {
  const find = (res: RegExp) => header.findIndex((h) => res.test(h.trim()));
  const dateCol = Math.max(0, find(/date|posted/i));
  const descCol = Math.max(0, find(/desc|payee|name|detail|memo|narrative|merchant|reference/i));

  // A single signed "Money in/out" / "Amount" column is the transaction amount.
  // IMPORTANT: never pick "Balance" as the amount — it's the running total.
  const moneyInOut = find(/money\s*in\s*\/?\s*out|amount|value/i);

  // Separate debit + credit columns (only when they're genuinely distinct)
  const debit = find(/debit|withdrawal|paid out|(?<!\/)money out/i);
  const credit = find(/credit|paid in|(?<!\/)money in(?!\/)/i);

  const m: CsvMapping = { dateCol, descCol, amountCol: moneyInOut >= 0 ? moneyInOut : 0 };
  if (debit >= 0 && credit >= 0 && debit !== credit) {
    m.debitCol = debit;
    m.creditCol = credit;
  }
  return m;
}
