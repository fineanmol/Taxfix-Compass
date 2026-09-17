import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Upload, RefreshCw, Repeat, Plus, Trash2, Eye, EyeOff, Sun, Moon, Monitor, Sparkles, Shapes, Wallet, ChevronRight, Zap, Landmark, Smartphone, Layers, AlertOctagon, Receipt } from "lucide-react";
import { useSettings } from "@/store/useSettings";
import { useAccounts, useCategories, useRecurring } from "@/hooks/useData";
import { CURRENCIES } from "@/lib/money";
import { downloadCsv, importCsv } from "@/lib/csv";
import { loadSampleData, clearSampleData } from "@/lib/sampleData";
import { syncConfigured } from "@/lib/sync";
import { useSync } from "@/store/useSync";
import { addRecurring, deleteRecurring, relabelCurrency, deleteAllTransactions, resetAllData } from "@/db/mutations";
import { db } from "@/db/db";
import { CategoryIcon } from "@/components/CategoryIcon";
import type { RecurInterval, ThemePref, TxType } from "@/db/types";
import dayjs from "dayjs";

export default function SettingsPage() {
  const navigate = useNavigate();
  const settings = useSettings((s) => s.settings);
  const update = useSettings((s) => s.update);
  const toggleHide = useSettings((s) => s.toggleHideBalances);
  const setTheme = useSettings((s) => s.setTheme);
  const recurring = useRecurring();
  const categories = useCategories();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState("");
  const [showRecur, setShowRecur] = useState(false);

  if (!settings) return null;

  async function onCurrencyChange(next: string) {
    const prev = settings!.currency;
    if (next === prev) return;
    await update({ currency: next });
    // offer to relabel existing data so amounts show in the new currency
    const total = await db.transactions.count();
    if (
      total > 0 &&
      confirm(
        `Show your existing ${total} transaction(s) and accounts in ${next} instead of ${prev}?\n\n` +
          `This relabels the currency only — amounts stay the same (no exchange-rate conversion).`
      )
    ) {
      const n = await relabelCurrency(next);
      setImportMsg(`Updated ${n} records to ${next}`);
    }
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const res = await importCsv(text);
    setImportMsg(`Imported ${res.imported} · skipped ${res.skipped}`);
    e.target.value = "";
  }

  return (
    <div className="safe-top space-y-5 px-4 pt-4">
      <h1 className="text-2xl font-bold tracking-tight text-content">Settings</h1>

      {/* preferences */}
      <Section title="Preferences">
        <Row label="Currency">
          <select
            value={settings.currency}
            onChange={(e) => onCurrencyChange(e.target.value)}
            className="input w-32"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} {c.symbol}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Month starts on day">
          <select
            value={settings.monthStartDay}
            onChange={(e) => update({ monthStartDay: Number(e.target.value) })}
            className="input w-20"
          >
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </Row>
        <Row label="Appearance">
          <ThemeToggle value={settings.theme} onChange={setTheme} />
        </Row>
        <Row label="Hide balances">
          <button onClick={toggleHide} className="rounded-full bg-surface-2 p-2 text-brand-700">
            {settings.hideBalances ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </Row>
      </Section>

      {/* manage */}
      <Section title="Manage">
        <button
          onClick={() => navigate("/categories")}
          className="flex w-full items-center gap-3 py-2.5 text-left"
        >
          <Shapes size={18} className="text-brand-600" />
          <span className="flex-1 text-sm text-content">Categories</span>
          <ChevronRight size={18} className="text-faint" />
        </button>
        <button
          onClick={() => navigate("/groups")}
          className="flex w-full items-center gap-3 py-2.5 text-left"
        >
          <Layers size={18} className="text-brand-600" />
          <span className="flex-1 text-sm text-content">Groups</span>
          <ChevronRight size={18} className="text-faint" />
        </button>
        <button
          onClick={() => navigate("/accounts")}
          className="flex w-full items-center gap-3 py-2.5 text-left"
        >
          <Wallet size={18} className="text-brand-600" />
          <span className="flex-1 text-sm text-content">Accounts</span>
          <ChevronRight size={18} className="text-faint" />
        </button>
      </Section>

      {/* recurring */}
      <Section
        title="Recurring transactions"
        action={
          <button onClick={() => setShowRecur(true)} className="text-brand-700">
            <Plus size={20} />
          </button>
        }
      >
        {recurring.length === 0 && (
          <p className="py-2 text-sm text-faint">None. They auto-add on each open.</p>
        )}
        {recurring.map((r) => {
          const cat = categories.find((c) => c.id === r.categoryId);
          return (
            <div key={r.id} className="flex items-center gap-3 py-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: (cat?.color ?? "#888") + "22", color: cat?.color }}
              >
                <CategoryIcon name={cat?.icon ?? "Repeat"} size={16} />
              </span>
              <div className="flex-1 text-sm">
                <p className="font-medium text-muted">
                  {cat?.name} · {r.amount} {r.currency}
                </p>
                <p className="text-xs text-faint">
                  {r.interval} · next {dayjs(r.nextRun).format("MMM D")}
                </p>
              </div>
              <button onClick={() => deleteRecurring(r.id)} className="text-faint hover:text-red-500">
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
      </Section>

      {/* data */}
      <Section title="Bank &amp; data">
        <button onClick={() => navigate("/import")} className="flex w-full items-center gap-3 py-2.5 text-left">
          <Landmark size={18} className="text-brand-600" />
          <span className="flex-1 text-sm text-content">Import bank / card statement</span>
          <ChevronRight size={18} className="text-faint" />
        </button>
        <button
          onClick={() => navigate("/import?kind=payslip")}
          className="flex w-full items-center gap-3 py-2.5 text-left"
        >
          <Receipt size={18} className="text-brand-600" />
          <span className="flex-1 text-sm text-content">Import German payslip</span>
          <ChevronRight size={18} className="text-faint" />
        </button>
        <button onClick={downloadCsv} className="flex w-full items-center gap-3 py-2.5 text-left">
          <Download size={18} className="text-brand-600" />
          <span className="text-sm text-content">Export CSV</span>
        </button>
        <button onClick={() => fileRef.current?.click()} className="flex w-full items-center gap-3 py-2.5 text-left">
          <Upload size={18} className="text-brand-600" />
          <span className="text-sm text-content">Import simple CSV</span>
        </button>
        {importMsg && <p className="text-xs text-mint">{importMsg}</p>}
        <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onImport} className="hidden" />
      </Section>

      <Section title="Demo data">
        <p className="py-2 text-xs leading-relaxed text-faint">
          Loads a fictional Nordlicht GmbH payslip (€110k gross, Steuerklasse I)
          for Aug–Sep 2026 plus everyday spend. Tagged so you can clear it without
          touching real transactions.
        </p>
        <button
          onClick={async () => {
            const n = await loadSampleData();
            await useSettings.getState().load();
            setImportMsg(`Loaded ${n} demo transactions`);
          }}
          className="flex w-full items-center gap-3 py-2.5 text-left"
        >
          <Sparkles size={18} className="text-brand-600" />
          <span className="flex-1 text-sm text-content">
            {settings.mockDataMode ? "Reload demo data" : "Load demo data"}
          </span>
        </button>
        <button
          onClick={async () => {
            const n = await clearSampleData();
            await useSettings.getState().load();
            setImportMsg(n ? `Removed ${n} demo transactions` : "No demo data to clear");
          }}
          className="flex w-full items-center gap-3 py-2.5 text-left"
        >
          <Trash2 size={18} className="text-muted" />
          <span className="text-sm text-content">Clear demo data</span>
        </button>
        {importMsg && <p className="py-2 text-xs text-mint">{importMsg}</p>}
      </Section>

      {/* sync */}
      <Section title="Cloud sync">
        <SyncControls configured={syncConfigured} />
      </Section>

      {/* quick add / iOS Back Tap */}
      <Section title="Quick add (iOS)">
        <button
          onClick={() => navigate("/setup-quickadd")}
          className="flex w-full items-center gap-3 py-2.5 text-left"
        >
          <Smartphone size={18} className="text-brand-600" />
          <span className="flex-1 text-sm text-content">Set up triple-tap quick add</span>
          <ChevronRight size={18} className="text-faint" />
        </button>
        <button
          onClick={() => navigate("/quick")}
          className="flex w-full items-center gap-3 py-2.5 text-left"
        >
          <Zap size={18} className="text-brand-600" />
          <span className="flex-1 text-sm text-content">Open quick-add screen</span>
          <ChevronRight size={18} className="text-faint" />
        </button>
      </Section>

      {/* danger zone */}
      <Section title="Danger zone">
        <button
          onClick={async () => {
            if (confirm("Delete ALL transactions? Accounts, categories and groups are kept. This can't be undone.")) {
              const n = await deleteAllTransactions();
              setImportMsg(`Deleted ${n} transactions`);
            }
          }}
          className="flex w-full items-center gap-3 py-2.5 text-left"
        >
          <Trash2 size={18} className="text-red-500" />
          <span className="text-sm text-red-500">Delete all transactions</span>
        </button>
        <button
          onClick={async () => {
            if (
              confirm(
                "Reset EVERYTHING? This wipes all transactions, accounts, categories, groups and settings, then starts fresh. This can't be undone."
              )
            ) {
              await resetAllData();
              location.reload();
            }
          }}
          className="flex w-full items-center gap-3 py-2.5 text-left"
        >
          <AlertOctagon size={18} className="text-red-500" />
          <span className="text-sm text-red-500">Reset everything (fresh start)</span>
        </button>
      </Section>

      <div className="pb-2 pt-2 text-center">
        <p className="text-sm font-semibold text-content">Spend</p>
        <p className="mt-0.5 text-xs text-faint">
          Privacy-first · your data stays on your device unless you opt into sync.
        </p>
      </div>

      {showRecur && (
        <AddRecurringSheet
          categories={categories}
          accounts={[]}
          defaultCurrency={settings.currency}
          onClose={() => setShowRecur(false)}
        />
      )}
    </div>
  );
}

function ThemeToggle({
  value,
  onChange,
}: {
  value: ThemePref;
  onChange: (t: ThemePref) => void;
}) {
  const opts: { key: ThemePref; icon: typeof Sun; label: string }[] = [
    { key: "light", icon: Sun, label: "Light" },
    { key: "dark", icon: Moon, label: "Dark" },
    { key: "system", icon: Monitor, label: "System" },
  ];
  return (
    <div className="flex rounded-full bg-surface-2 p-1">
      {opts.map((o) => {
        const active = value === o.key;
        const Icon = o.icon;
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            aria-label={o.label}
            title={o.label}
            className={`rounded-full p-2 transition ${
              active ? "bg-brand-gradient text-white shadow-card" : "text-muted"
            }`}
          >
            <Icon size={16} />
          </button>
        );
      })}
    </div>
  );
}

function SyncControls({ configured }: { configured: boolean }) {
  const { email, status, message, init, signIn, signOut, syncNow } = useSync();
  const [input, setInput] = useState("");

  useEffect(() => {
    init();
  }, [init]);

  if (!configured) {
    return (
      <p className="py-2 text-sm text-faint">
        Optional. Add Supabase keys to <code className="text-brand-700">.env.local</code> to
        enable cross-device sync. Until then, all data stays on this device.
      </p>
    );
  }

  if (email) {
    return (
      <div className="space-y-2 py-1">
        <p className="text-sm text-muted">
          Signed in as <span className="font-medium text-content">{email}</span>
        </p>
        <div className="flex gap-2">
          <button onClick={syncNow} disabled={status === "syncing"} className="btn-primary flex-1 disabled:opacity-50">
            <RefreshCw size={16} className="mr-1 inline" />
            {status === "syncing" ? "Syncing…" : "Sync now"}
          </button>
          <button onClick={signOut} className="rounded-xl border border-line px-4 text-sm text-muted">
            Sign out
          </button>
        </div>
        {message && <p className="text-xs text-faint">{message}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2 py-1">
      <input
        type="email"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="you@example.com"
        className="input"
      />
      <button
        onClick={() => signIn(input.trim())}
        disabled={!input.includes("@") || status === "syncing"}
        className="btn-primary w-full disabled:opacity-50"
      >
        Email me a sign-in link
      </button>
      {message && <p className="text-xs text-muted">{message}</p>}
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-4">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted">{title}</h2>
        {action}
      </div>
      <div className="divide-y divide-line">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-muted">{label}</span>
      {children}
    </div>
  );
}

const INTERVALS: RecurInterval[] = ["daily", "weekly", "monthly", "yearly"];

function AddRecurringSheet({
  categories,
  onClose,
  defaultCurrency,
}: {
  categories: { id: string; name: string; type: string }[];
  accounts: unknown[];
  defaultCurrency: string;
  onClose: () => void;
}) {
  const accounts = useAccounts();
  const [type, setType] = useState<TxType>("expense");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [interval, setInterval] = useState<RecurInterval>("monthly");
  const [accountId, setAccountId] = useState("");

  const visCats = categories.filter((c) => c.type === type);
  if (!categoryId && visCats.length) setCategoryId(visCats[0].id);
  if (!accountId && accounts.length) setAccountId(accounts[0].id);

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/30" onClick={onClose}>
      <div className="safe-bottom w-full max-w-md rounded-t-3xl bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-2">
          <Repeat size={20} className="text-brand-700" />
          <h2 className="text-lg font-bold text-content">New recurring</h2>
        </div>
        <div className="space-y-3">
          <div className="flex rounded-full bg-surface-2 p-1">
            {(["expense", "income"] as TxType[]).map((t) => (
              <button
                key={t}
                onClick={() => { setType(t); setCategoryId(""); }}
                className={`flex-1 rounded-full py-1.5 text-sm font-medium capitalize ${
                  type === t ? "bg-surface text-brand-700 shadow-card" : "text-muted"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input">
            {visCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="input" />
            <select value={interval} onChange={(e) => setInterval(e.target.value as RecurInterval)} className="input capitalize">
              {INTERVALS.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          {accounts.length > 1 && (
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="input">
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          )}
          <button
            disabled={!categoryId || !amount || Number(amount) <= 0 || !accountId}
            onClick={async () => {
              await addRecurring({
                amount: Number(amount),
                type,
                categoryId,
                accountId,
                currency: defaultCurrency,
                interval,
                nextRun: dayjs().startOf("day").valueOf(),
              });
              onClose();
            }}
            className="btn-primary w-full disabled:opacity-40"
          >
            Save recurring
          </button>
        </div>
      </div>
    </div>
  );
}
