/**
 * Client-side PDF statement parsing via pdf.js. Runs fully in the browser —
 * the PDF is never uploaded. Only text-based PDFs work (scanned/image PDFs
 * have no text layer and would need OCR, which we don't do).
 *
 * Bank/card layouts vary wildly, so parsing is heuristic and best-effort:
 * we reconstruct visual lines from text positions, then on each line look for
 * a date and one or more money amounts; the leftover text is the description.
 * The user reviews and fixes everything in the import preview before saving.
 */
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import type { ParsedRow } from "./statement";

dayjs.extend(customParseFormat);
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

interface Line {
  y: number;
  text: string;
}

/** Extract text from every page, grouped into visual lines by y-position. */
export async function extractPdfLines(data: ArrayBuffer): Promise<string[]> {
  const doc = await pdfjs.getDocument({ data }).promise;
  const allLines: string[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const lines: Line[] = [];

    for (const item of content.items) {
      const it = item as { str: string; transform: number[] };
      if (!it.str.trim()) continue;
      const y = Math.round(it.transform[5]); // vertical position
      // group items whose baselines are within a few px into one line
      const existing = lines.find((l) => Math.abs(l.y - y) < 3);
      if (existing) existing.text += " " + it.str;
      else lines.push({ y, text: it.str });
    }

    // PDF y grows upward → sort descending so reading order is top-to-bottom
    lines.sort((a, b) => b.y - a.y);
    for (const l of lines) allLines.push(l.text.replace(/\s+/g, " ").trim());
  }
  return allLines;
}

// date patterns seen across bank statements
const DATE_PATTERNS: Array<{ re: RegExp; fmts: string[] }> = [
  { re: /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/, fmts: ["DD/MM/YYYY", "MM/DD/YYYY", "DD-MM-YYYY", "D/M/YY", "DD/MM/YY"] },
  { re: /\b(\d{4}-\d{2}-\d{2})\b/, fmts: ["YYYY-MM-DD"] },
  { re: /\b(\d{1,2}\s+[A-Za-z]{3,9}\.?\s+\d{2,4})\b/, fmts: ["D MMM YYYY", "DD MMMM YYYY", "D MMM YY"] },
  { re: /\b([A-Za-z]{3,9}\.?\s+\d{1,2},?\s+\d{2,4})\b/, fmts: ["MMM D YYYY", "MMMM D YYYY", "MMM D, YYYY"] },
];

// money like 1,234.56 / -12.00 / (45.20) / £12.34 / 12.34 DR
const MONEY = /[-(]?\s*(?:[£$€]\s*)?\d{1,3}(?:,\d{3})*(?:\.\d{2})(?:\s*(?:DR|CR))?\)?/gi;

// description keywords that usually mean money IN
const INCOME_HINT = /salary|payroll|wages|refund|reimburse|interest|dividend|deposit|credit|received|payment from|transfer in|cashback|hmrc|rebate/i;

function parseDate(line: string, hintFormat?: string): number | null {
  for (const { re, fmts } of DATE_PATTERNS) {
    const m = line.match(re);
    if (!m) continue;
    const raw = m[1];
    const tryFmts = hintFormat ? [hintFormat, ...fmts] : fmts;
    for (const f of tryFmts) {
      const d = dayjs(raw, f, true);
      if (d.isValid()) return new Date(d.year(), d.month(), d.date(), 12).getTime();
    }
    // last resort: let dayjs guess
    const g = dayjs(raw);
    if (g.isValid()) return new Date(g.year(), g.month(), g.date(), 12).getTime();
  }
  return null;
}

function parseAmount(token: string): { value: number; explicitSign: number } {
  const t = token.trim();
  const isParen = /^\(.*\)$/.test(t);
  const isDR = /DR/i.test(t);
  const isCR = /CR/i.test(t);
  const hasMinus = /^-/.test(t);
  const num = parseFloat(t.replace(/[^\d.]/g, ""));
  let explicitSign = 0;
  if (isParen || isDR || hasMinus) explicitSign = -1;
  else if (isCR) explicitSign = 1;
  return { value: num, explicitSign };
}

export interface PdfParseResult {
  rows: ParsedRow[];
  totalLines: number;
  matchedLines: number;
}

/**
 * Heuristic parse of extracted lines into transaction rows.
 *
 * @param hintFormat optional dayjs date format if auto-detect misreads dates
 * @param positiveIsExpense if the statement lists spending as positive numbers
 */
export function parsePdfLines(
  lines: string[],
  opts: { hintFormat?: string; positiveIsExpense?: boolean } = {}
): PdfParseResult {
  const rows: ParsedRow[] = [];
  let matched = 0;

  for (const line of lines) {
    const date = parseDate(line, opts.hintFormat);
    if (date === null) continue;

    const moneyTokens = line.match(MONEY);
    if (!moneyTokens || moneyTokens.length === 0) continue;

    // Heuristic: the LAST money token on a line is usually the running balance
    // when there are 2+; the transaction amount is the one before it. With a
    // single money token, that's the amount.
    let amountToken: string;
    if (moneyTokens.length >= 2) amountToken = moneyTokens[moneyTokens.length - 2];
    else amountToken = moneyTokens[0];

    const { value, explicitSign } = parseAmount(amountToken);
    if (!Number.isFinite(value) || value === 0) continue;

    // description = line with date + all money tokens stripped
    let desc = line;
    for (const t of moneyTokens) desc = desc.replace(t, " ");
    for (const { re } of DATE_PATTERNS) desc = desc.replace(re, " ");
    desc = desc.replace(/\s+/g, " ").trim() || "Transaction";

    // determine expense/income. Explicit signals (−, DR, CR, parens) win;
    // otherwise use income keywords; otherwise assume expense (most lines are).
    let sign: number;
    if (explicitSign !== 0) sign = explicitSign;
    else if (INCOME_HINT.test(desc)) sign = 1;
    else sign = -1;

    rows.push({
      date,
      amount: value,
      type: sign < 0 ? "expense" : "income",
      description: desc.slice(0, 80),
    });
    matched++;
  }

  return { rows, totalLines: lines.length, matchedLines: matched };
}
