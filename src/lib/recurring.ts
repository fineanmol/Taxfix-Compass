import dayjs from "dayjs";
import { db } from "@/db/db";
import type { Recurring, Transaction } from "@/db/types";
import { uid } from "./id";

function advance(ms: number, interval: Recurring["interval"]): number {
  const d = dayjs(ms);
  switch (interval) {
    case "daily":
      return d.add(1, "day").valueOf();
    case "weekly":
      return d.add(1, "week").valueOf();
    case "yearly":
      return d.add(1, "year").valueOf();
    case "monthly":
    default:
      return d.add(1, "month").valueOf();
  }
}

/**
 * Materialize any recurring rules whose nextRun is due (<= now) into real
 * transactions, advancing nextRun until it's in the future. Called on app open.
 * Returns the number of transactions created.
 */
export async function materializeRecurring(now = Date.now()): Promise<number> {
  const due = await db.recurring.where("nextRun").belowOrEqual(now).toArray();
  if (due.length === 0) return 0;

  const newTxs: Transaction[] = [];
  const updates: Recurring[] = [];

  for (const r of due) {
    let next = r.nextRun;
    // Cap iterations to avoid runaway loops on long-dormant rules.
    let guard = 0;
    while (next <= now && (r.until === undefined || next <= r.until) && guard < 1000) {
      newTxs.push({
        id: uid(),
        amount: r.amount,
        type: r.type,
        categoryId: r.categoryId,
        accountId: r.accountId,
        date: next,
        note: r.note,
        currency: r.currency,
        recurringId: r.id,
        createdAt: now,
        updatedAt: now,
      });
      next = advance(next, r.interval);
      guard++;
    }
    updates.push({ ...r, nextRun: next });
  }

  await db.transaction("rw", db.transactions, db.recurring, async () => {
    if (newTxs.length) await db.transactions.bulkPut(newTxs);
    await db.recurring.bulkPut(updates);
  });

  return newTxs.length;
}
