import dayjs from "dayjs";
import { db } from "@/db/db";
import type { Transaction, TxType } from "@/db/types";
import { uid } from "./id";
import { ensureSeeded } from "./seed";
import { mockGermanPayslipLines, parseGermanPayslip } from "./payslip";

export const SAMPLE_NOTE = "[sample]";

function paydayNoon(month: dayjs.Dayjs): number {
  return new Date(month.year(), month.month() + 1, 0, 12).getTime();
}

/**
 * Demo dataset: Nordlicht GmbH payslips for Sep + Aug 2026 (€110k gross)
 * plus everyday spend in those months. Safe to reload (clears `[sample]` rows).
 */
export async function loadSampleData(): Promise<number> {
  await ensureSeeded();

  const [accounts, categories] = await Promise.all([
    db.accounts.toArray(),
    db.categories.toArray(),
  ]);
  if (!accounts.length || !categories.length) return 0;

  await clearSampleData();

  const acc = accounts[0];
  const catByName = (n: string, type: TxType) =>
    categories.find((c) => c.name === n && c.type === type) ??
    categories.find((c) => c.type === type);

  const payrollMonths = [dayjs("2026-09-01"), dayjs("2026-08-01")];

  const plan: Array<{ cat: string; min: number; max: number; perMonth: number }> = [
    { cat: "Food & Drink", min: 8, max: 45, perMonth: 10 },
    { cat: "Groceries", min: 20, max: 90, perMonth: 6 },
    { cat: "Transport", min: 3, max: 30, perMonth: 8 },
    { cat: "Shopping", min: 15, max: 80, perMonth: 3 },
    { cat: "Entertainment", min: 10, max: 40, perMonth: 3 },
  ];

  const txs: Transaction[] = [];
  let seed = 12345;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  const euroNotes: Record<string, string[]> = {
    "Food & Drink": ["Café Nordlicht", "Lieferando", "Mittag Kantine"],
    Groceries: ["REWE", "Edeka", "Bio Company"],
    Transport: ["BVG", "DB Vertrieb", "Flixbus"],
    Shopping: ["IKEA", "Amazon", "H&M"],
    Entertainment: ["Netflix", "Kino", "Spotify"],
  };

  for (const month of payrollMonths) {
    const parsed = parseGermanPayslip(mockGermanPayslipLines(month));
    const date = paydayNoon(month);
    for (const row of parsed.rows) {
      const cat = catByName(row.description, row.type);
      if (!cat) continue;
      txs.push({
        id: uid(),
        amount: row.amount,
        type: row.type,
        categoryId: cat.id,
        accountId: acc.id,
        date,
        note: `${SAMPLE_NOTE} Nordlicht GmbH · ${row.description}`,
        currency: acc.currency,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    const daysInMonth = month.daysInMonth();
    for (const p of plan) {
      const cat = catByName(p.cat, "expense");
      if (!cat) continue;
      const names = euroNotes[p.cat] ?? [p.cat];
      for (let i = 0; i < p.perMonth; i++) {
        const day = 1 + Math.floor(rand() * Math.min(28, daysInMonth - 1));
        const amount = Math.round((p.min + rand() * (p.max - p.min)) * 100) / 100;
        const merchant = names[Math.floor(rand() * names.length)];
        txs.push({
          id: uid(),
          amount,
          type: "expense",
          categoryId: cat.id,
          accountId: acc.id,
          date: new Date(month.year(), month.month(), day, 12).getTime(),
          note: `${SAMPLE_NOTE} ${merchant}`,
          currency: acc.currency,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }
  }

  await db.transactions.bulkPut(txs);

  const settings = await db.settings.get("app");
  if (settings) await db.settings.put({ ...settings, mockDataMode: true });

  return txs.length;
}

export async function clearSampleData(): Promise<number> {
  const old = await db.transactions.filter((t) => (t.note ?? "").startsWith(SAMPLE_NOTE)).primaryKeys();
  if (old.length) await db.transactions.bulkDelete(old);
  const settings = await db.settings.get("app");
  if (settings?.mockDataMode) await db.settings.put({ ...settings, mockDataMode: false });
  return old.length;
}

export async function sampleDataCount(): Promise<number> {
  return db.transactions.filter((t) => (t.note ?? "").startsWith(SAMPLE_NOTE)).count();
}
