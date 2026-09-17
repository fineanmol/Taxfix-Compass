import dayjs from "dayjs";
import { db } from "@/db/db";
import type { Transaction } from "@/db/types";
import { uid } from "./id";

export const SAMPLE_NOTE = "[sample]";

/**
 * Populate the current + previous period with realistic sample transactions
 * so charts, comparisons and legends have something to show. Safe to run
 * multiple times (clears prior sample rows tagged with note "[sample]").
 */
export async function loadSampleData(): Promise<number> {
  const [accounts, categories] = await Promise.all([
    db.accounts.toArray(),
    db.categories.where("type").equals("expense").toArray(),
  ]);
  const incomeCats = await db.categories.where("type").equals("income").toArray();
  if (!accounts.length || !categories.length) return 0;

  await clearSampleData();

  const acc = accounts[0];
  const now = dayjs();
  const catByName = (n: string) => categories.find((c) => c.name === n) ?? categories[0];

  const plan: Array<{ cat: string; min: number; max: number; perMonth: number }> = [
    { cat: "Food & Drink", min: 8, max: 45, perMonth: 22 },
    { cat: "Groceries", min: 20, max: 90, perMonth: 8 },
    { cat: "Transport", min: 3, max: 30, perMonth: 14 },
    { cat: "Shopping", min: 15, max: 160, perMonth: 4 },
    { cat: "Bills", min: 40, max: 220, perMonth: 3 },
    { cat: "Entertainment", min: 10, max: 60, perMonth: 5 },
    { cat: "Health", min: 12, max: 80, perMonth: 2 },
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
    Bills: ["Vodafone", "Stadtwerke", "Hallesche"],
    Entertainment: ["Netflix", "Kino", "Spotify"],
    Health: ["Apotheke", "Zahnarzt"],
  };

  for (const windowIdx of [0, 1]) {
    const scale = windowIdx === 1 ? 1.18 : 1;
    for (const p of plan) {
      const cat = catByName(p.cat);
      const count = Math.max(1, Math.round(p.perMonth * scale));
      const names = euroNotes[p.cat] ?? [p.cat];
      for (let i = 0; i < count; i++) {
        const daysAgo = windowIdx * 30 + Math.floor(rand() * 30);
        const date = now.subtract(daysAgo, "day");
        const amount = Math.round((p.min + rand() * (p.max - p.min)) * 100) / 100;
        const merchant = names[Math.floor(rand() * names.length)];
        txs.push({
          id: uid(),
          amount,
          type: "expense",
          categoryId: cat.id,
          accountId: acc.id,
          date: date.valueOf(),
          note: `${SAMPLE_NOTE} ${merchant}`,
          currency: acc.currency,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }
    if (incomeCats.length) {
      const salary = incomeCats.find((c) => c.name === "Salary") ?? incomeCats[0];
      txs.push({
        id: uid(),
        amount: 2476.61,
        type: "income",
        categoryId: salary.id,
        accountId: acc.id,
        date: now.subtract(windowIdx * 30 + 28, "day").valueOf(),
        note: `${SAMPLE_NOTE} Nordlicht GmbH (payslip)`,
        currency: acc.currency,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
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
