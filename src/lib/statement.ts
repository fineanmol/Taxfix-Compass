/**
 * Bank/credit-card statement parsing (OFX/QFX + CSV) for local import.
 *
 * No network, no aggregator — the user exports a statement from their bank and
 * drops the file in. This keeps the app fully offline and private. (For live
 * auto-sync you'd need a backend + an aggregator like GoCardless/Plaid; see
 * README.)
 */
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

// enable strict format parsing for bank date formats like DD/MM/YYYY
dayjs.extend(customParseFormat);

/** A raw transaction parsed from a statement, before mapping to our schema. */
export interface ParsedRow {
  date: number; // epoch ms
  amount: number; // absolute value
  type: "expense" | "income"; // derived from sign
  description: string;
}

// ---------- OFX / QFX ----------

/** Parse an OFX/QFX statement string into rows. */
export function parseOfx(text: string): ParsedRow[] {
  const rows: ParsedRow[] = [];
  // OFX transactions live in <STMTTRN>…</STMTTRN> blocks. Tags may be
  // unclosed (SGML style), so match value up to the next tag or newline.
  const blocks = text.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) ?? [];
  const tag = (block: string, name: string) => {
    const m = block.match(new RegExp(`<${name}>([^<\r\n]*)`, "i"));
    return m ? m[1].trim() : "";
  };

  for (const b of blocks) {
    const rawAmt = parseFloat(tag(b, "TRNAMT"));
    if (!Number.isFinite(rawAmt)) continue;
    const dt = tag(b, "DTPOSTED") || tag(b, "DTUSER");
    const desc = tag(b, "NAME") || tag(b, "MEMO") || tag(b, "PAYEE") || "Transaction";
    rows.push({
      date: parseOfxDate(dt),
      amount: Math.abs(rawAmt),
      type: rawAmt < 0 ? "expense" : "income",
      description: decodeEntities(desc),
    });
  }
  return rows;
}

/** OFX dates look like 20260701, 20260701120000, or 20260701120000.000[-5:EST] */
function parseOfxDate(s: string): number {
  const clean = s.replace(/\[.*$/, "").trim();
  const y = Number(clean.slice(0, 4));
  const m = Number(clean.slice(4, 6));
  const d = Number(clean.slice(6, 8));
  if (!y || !m || !d) return Date.now();
  // construct at local noon to avoid any timezone day-shift
  return new Date(y, m - 1, d, 12, 0, 0).getTime();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}

// ---------- CSV ----------

/** Split CSV text into a header row + data rows, honoring quotes. */
export function parseCsvGrid(text: string): { header: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) return { header: [], rows: [] };
  const grid = lines.map(parseCsvLine);
  return { header: grid[0], rows: grid.slice(1) };
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export interface CsvMapping {
  dateCol: number;
  amountCol: number;
  descCol: number;
  /** optional separate debit/credit columns instead of one signed amount */
  debitCol?: number;
  creditCol?: number;
  dateFormat?: string; // dayjs format hint, e.g. "DD/MM/YYYY"
  /** if true, positive amounts are expenses (some banks export it this way) */
  positiveIsExpense?: boolean;
}

/** Turn CSV rows into ParsedRows using a user-chosen column mapping. */
export function mapCsvRows(rows: string[][], m: CsvMapping): ParsedRow[] {
  const out: ParsedRow[] = [];
  for (const cols of rows) {
    const rawDate = (cols[m.dateCol] ?? "").trim();
    const d = m.dateFormat ? dayjs(rawDate, m.dateFormat, true) : dayjs(rawDate);
    if (!d.isValid()) continue;
    // normalize to local noon so timezones never shift the calendar day
    const dateMs = new Date(d.year(), d.month(), d.date(), 12).getTime();

    let signed: number;
    if (m.debitCol !== undefined || m.creditCol !== undefined) {
      const debit = num(cols[m.debitCol ?? -1]);
      const credit = num(cols[m.creditCol ?? -1]);
      signed = credit - debit; // credit = money in
    } else {
      signed = num(cols[m.amountCol]);
      if (m.positiveIsExpense) signed = -signed;
    }
    if (!Number.isFinite(signed) || signed === 0) continue;

    out.push({
      date: dateMs,
      amount: Math.abs(signed),
      type: signed < 0 ? "expense" : "income",
      description: (cols[m.descCol] ?? "Transaction").trim() || "Transaction",
    });
  }
  return out;
}

function num(s: string | undefined): number {
  if (!s) return 0;
  // strip currency symbols, thousands separators, spaces; handle (123) as -123
  const neg = /^\(.*\)$/.test(s.trim());
  const cleaned = s.replace(/[^\d.-]/g, "");
  const v = parseFloat(cleaned);
  if (!Number.isFinite(v)) return 0;
  return neg ? -Math.abs(v) : v;
}

// ---------- Dedup fingerprint ----------

/** Stable hash of the identifying fields, used to skip re-imported rows. */
export function importHash(accountId: string, r: ParsedRow): string {
  const day = dayjs(r.date).format("YYYY-MM-DD");
  const key = `${accountId}|${day}|${r.amount.toFixed(2)}|${r.type}|${r.description.toLowerCase().slice(0, 40)}`;
  // small djb2 hash — collisions here only cost a skipped near-identical row
  let h = 5381;
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h + key.charCodeAt(i)) | 0;
  return `h${(h >>> 0).toString(36)}`;
}

/** Detect file kind from name/content. */
export function detectFormat(name: string, text: string): "ofx" | "csv" {
  if (/\.(ofx|qfx)$/i.test(name) || /<OFX>/i.test(text) || /<STMTTRN>/i.test(text)) return "ofx";
  return "csv";
}
