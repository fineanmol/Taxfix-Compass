/**
 * German payslip (Gehalts-/Entgelt-/Lohnabrechnung) parser.
 *
 * Turns a text-based PDF or spreadsheet into the same ParsedRow list as bank
 * import, so the user can review net pay + employee deductions before saving.
 * Employer (AG) shares are skipped — those are not the employee's money.
 *
 * Layouts vary (DATEV, Lexware, Personio, SAP). This is heuristic and
 * best-effort; preview is the source of truth.
 */
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import type { ParsedRow } from "./statement";

dayjs.extend(customParseFormat);

const HINTS = [
  /gehaltsabrechnung/i,
  /entgeltabrechnung/i,
  /lohnabrechnung/i,
  /abrechnungs(?:zeitraum|monat|periode)/i,
  /steuerklasse/i,
  /lohnsteuer/i,
  /sozialversicherung/i,
  /netto(?:verdienst|[- ]?bez[uü]ge)/i,
  /auszahlungsbetrag/i,
  /brutto[- ]?bez[uü]ge/i,
  /rentenversicherung/i,
  /kirchensteuer/i,
];

export function looksLikeGermanPayslip(text: string): boolean {
  let hits = 0;
  for (const re of HINTS) if (re.test(text)) hits++;
  return hits >= 2;
}

/** German/EU money: 1.234,56 or 1234,56 or € 3.200,00 */
export function parseGermanMoney(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const neg = /^\(.*\)$/.test(t) || /^-/.test(t.replace(/€/, "").trim());
  let s = t.replace(/[€\s]/g, "");
  if (/^\(.*\)$/.test(s)) s = s.slice(1, -1);
  s = s.replace(/^[+−–-]/, "");
  if (/\d\.\d{3}/.test(s) && s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",") && !s.includes(".")) {
    s = s.replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }
  s = s.replace(/[^\d.]/g, "");
  const n = parseFloat(s);
  if (!Number.isFinite(n) || n === 0) return null;
  return neg ? -Math.abs(n) : n;
}

const MONEY_RE = /-?\(?\s*(?:€\s*)?\d{1,3}(?:\.\d{3})*,\d{2}\s*€?\)?|-?\(?\s*(?:€\s*)?\d+,\d{2}\s*€?\)?/g;

function amountsIn(line: string): number[] {
  const out: number[] = [];
  const matches = line.match(MONEY_RE) ?? [];
  for (const m of matches) {
    const n = parseGermanMoney(m);
    if (n !== null) out.push(Math.abs(n));
  }
  return out;
}

const MONTHS: Record<string, number> = {
  januar: 0,
  februar: 1,
  märz: 2,
  maerz: 2,
  april: 3,
  mai: 4,
  juni: 5,
  juli: 6,
  august: 7,
  september: 8,
  oktober: 9,
  november: 10,
  dezember: 11,
};

function endOfPeriod(lines: string[]): number {
  const blob = lines.join(" ");
  const zahltag = blob.match(/zahltag[:\s]+(\d{1,2}\.\d{1,2}\.\d{2,4})/i);
  if (zahltag) {
    const d = dayjs(zahltag[1], ["DD.MM.YYYY", "D.M.YYYY", "DD.MM.YY"], true);
    if (d.isValid()) return new Date(d.year(), d.month(), d.date(), 12).getTime();
  }
  const span = blob.match(
    /(\d{1,2}\.\d{1,2}\.\d{2,4})\s*[-–]|bis\s+(\d{1,2}\.\d{1,2}\.\d{2,4})/i
  );
  const endRaw = span?.[2] ?? blob.match(/[-–]\s*(\d{1,2}\.\d{1,2}\.\d{2,4})/)?.[1];
  if (endRaw) {
    const d = dayjs(endRaw, ["DD.MM.YYYY", "D.M.YYYY", "DD.MM.YY"], true);
    if (d.isValid()) return new Date(d.year(), d.month(), d.date(), 12).getTime();
  }
  const my = blob.match(/abrechnungs(?:monat|zeitraum|periode)[:\s]+(\d{1,2})[./](\d{4})/i);
  if (my) {
    const month = Number(my[1]) - 1;
    const year = Number(my[2]);
    return new Date(year, month + 1, 0, 12).getTime();
  }
  for (const [name, idx] of Object.entries(MONTHS)) {
    const re = new RegExp(`${name}\\s+(\\d{4})`, "i");
    const m = blob.match(re);
    if (m) return new Date(Number(m[1]), idx + 1, 0, 12).getTime();
  }
  const any = blob.match(/\b(\d{1,2}\.\d{1,2}\.\d{4})\b/);
  if (any) {
    const d = dayjs(any[1], "DD.MM.YYYY", true);
    if (d.isValid()) return new Date(d.year(), d.month(), d.date(), 12).getTime();
  }
  return new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 12).getTime();
}

type Kind =
  | "net"
  | "gross"
  | "lohnsteuer"
  | "soli"
  | "kirche"
  | "rv"
  | "av"
  | "kv"
  | "pv";

interface Spec {
  kind: Kind;
  re: RegExp;
  description: string;
  type: ParsedRow["type"];
}

const SPECS: Spec[] = [
  {
    kind: "net",
    re: /auszahlungsbetrag|nettoverdienst|netto[- ]?bez[uü]ge|überweisung(?:sbetrag)?|auszahlung(?!\s*ag)/i,
    description: "Net salary (Auszahlung)",
    type: "income",
  },
  { kind: "gross", re: /brutto[- ]?bez[uü]ge|gesamtbrutto|steuerbrutto|^brutto\b/i, description: "Gross", type: "income" },
  { kind: "lohnsteuer", re: /lohnsteuer(?!\s*brutto)/i, description: "Lohnsteuer", type: "expense" },
  { kind: "soli", re: /solidarit/i, description: "Solidaritätszuschlag", type: "expense" },
  { kind: "kirche", re: /kirchensteuer/i, description: "Kirchensteuer", type: "expense" },
  { kind: "rv", re: /rentenversicherung|\brv[- ]?(?:beitrag|an)\b/i, description: "Rentenversicherung (AN)", type: "expense" },
  { kind: "av", re: /arbeitslosenversicherung|\bav[- ]?(?:beitrag|an)\b/i, description: "Arbeitslosenversicherung (AN)", type: "expense" },
  { kind: "kv", re: /krankenversicherung|\bkv[- ]?(?:beitrag|an)\b/i, description: "Krankenversicherung (AN)", type: "expense" },
  { kind: "pv", re: /pflegeversicherung|\bpv[- ]?(?:beitrag|an)\b/i, description: "Pflegeversicherung (AN)", type: "expense" },
];

function skipLine(line: string): boolean {
  const hasAG = /\bag\b|arbeitgeberanteil|arbeitgeber[- ]beitrag/i.test(line);
  const hasAN = /\ban\b|arbeitnehmeranteil/i.test(line);
  if (hasAG && !hasAN) return true;
  if (/steuerklasse|identifikations|sozialversicherungsnr|steuer[- ]?id|\biban\b|personalnr/i.test(line)) {
    return true;
  }
  return false;
}

function pickAmount(line: string, kind: Kind): number | null {
  const amts = amountsIn(line);
  if (!amts.length) return null;
  // DATEV SV lines often list AN then AG — take the first (employee) share.
  if (kind === "rv" || kind === "av" || kind === "kv" || kind === "pv") return amts[0];
  return amts[amts.length - 1];
}

export interface PayslipParseResult {
  rows: ParsedRow[];
  periodEnd: number;
  matched: Partial<Record<Kind, number>>;
}

export function parseGermanPayslip(lines: string[]): PayslipParseResult {
  const periodEnd = endOfPeriod(lines);
  const matched: Partial<Record<Kind, number>> = {};

  for (const raw of lines) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line || skipLine(line)) continue;
    for (const spec of SPECS) {
      if (matched[spec.kind] !== undefined) continue;
      if (!spec.re.test(line)) continue;
      const amt = pickAmount(line, spec.kind);
      if (amt === null) continue;
      matched[spec.kind] = amt;
      break;
    }
  }

  // If net is missing but gross + deductions exist, derive net.
  if (matched.net === undefined && matched.gross !== undefined) {
    const deductions = (["lohnsteuer", "soli", "kirche", "rv", "av", "kv", "pv"] as Kind[])
      .map((k) => matched[k] ?? 0)
      .reduce((a, b) => a + b, 0);
    const net = Math.round((matched.gross - deductions) * 100) / 100;
    if (net > 0) matched.net = net;
  }

  const rows: ParsedRow[] = [];
  const push = (kind: Kind, description: string, type: ParsedRow["type"]) => {
    const amount = matched[kind];
    if (amount === undefined) return;
    rows.push({ date: periodEnd, amount, type, description });
  };

  push("net", "Net salary (Auszahlung)", "income");
  push("lohnsteuer", "Lohnsteuer", "expense");
  push("soli", "Solidaritätszuschlag", "expense");
  push("kirche", "Kirchensteuer", "expense");
  push("rv", "Rentenversicherung (AN)", "expense");
  push("av", "Arbeitslosenversicherung (AN)", "expense");
  push("kv", "Krankenversicherung (AN)", "expense");
  push("pv", "Pflegeversicherung (AN)", "expense");

  return { rows, periodEnd, matched };
}

export function gridToPayslipLines(grid: string[][]): string[] {
  return grid.map((r) => r.filter((c) => c.trim()).join(" ")).filter(Boolean);
}

/** Fictional DATEV-style slip for testing — no real personal data. */
export const MOCK_GERMAN_PAYSLIP_LINES: string[] = `
Nordlicht GmbH
Musterstraße 1
10115 Berlin

Entgeltabrechnung
Abrechnungszeitraum: 01.07.2026 - 31.07.2026
Personalnr. 10042
Steuerklasse I

Bezeichnung                         Betrag
Grundgehalt                       3.800,00
Brutto-Bezüge                     3.800,00

Lohnsteuer                          512,41
Solidaritätszuschlag                 28,18
Rentenversicherung AN               353,40
Arbeitslosenversicherung AN          49,40
Krankenversicherung AN              304,00
Pflegeversicherung AN                76,00

Rentenversicherung AG               353,40
Krankenversicherung AG              304,00

Netto-Bezüge / Auszahlungsbetrag  2.476,61
Zahltag 31.07.2026
`.trim().split("\n");
