import dayjs from "dayjs";
import { db } from "@/db/db";
import type { Transaction } from "@/db/types";
import { uid } from "./id";

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

  // remove previous sample rows
  const old = await db.transactions.filter((t) => t.note === "[sample]").primaryKeys();
  if (old.length) await db.transactions.bulkDelete(old);

  const acc = accounts[0];
  const now = dayjs();
  const catByName = (n: string) => categories.find((c) => c.name === n) ?? categories[0];

  // weight categories so the donut looks realistic
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
  // deterministic pseudo-random (no Math.random dependency on Date)
  let seed = 12345;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  // Spread across the trailing 60 days (two 30-day windows) so charts look
  // populated regardless of today's calendar date. Window 0 = last 30 days,
  // window 1 = the 30 before that (used for the period-over-period comparison).
  for (const windowIdx of [0, 1]) {
    // slightly lower spend in the current window so "% change" trends down
    const scale = windowIdx === 1 ? 1.18 : 1;
    for (const p of plan) {
      const cat = catByName(p.cat);
      const count = Math.max(1, Math.round(p.perMonth * scale));
      for (let i = 0; i < count; i++) {
        const daysAgo = windowIdx * 30 + Math.floor(rand() * 30);
        const date = now.subtract(daysAgo, "day");
        const amount = Math.round((p.min + rand() * (p.max - p.min)) * 100) / 100;
        txs.push({
          id: uid(),
          amount,
          type: "expense",
          categoryId: cat.id,
          accountId: acc.id,
          date: date.valueOf(),
          note: "[sample]",
          currency: acc.currency,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }
    // one salary income near the start of each window
    if (incomeCats.length) {
      txs.push({
        id: uid(),
        amount: 3200,
        type: "income",
        categoryId: incomeCats[0].id,
        accountId: acc.id,
        date: now.subtract(windowIdx * 30 + 28, "day").valueOf(),
        note: "[sample]",
        currency: acc.currency,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  }

  await db.transactions.bulkPut(txs);
  return txs.length;
}
