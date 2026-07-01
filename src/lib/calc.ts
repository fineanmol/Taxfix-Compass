import type { Account, Transaction } from "@/db/types";

export function signed(t: Pick<Transaction, "amount" | "type">): number {
  return t.type === "income" ? t.amount : -t.amount;
}

/** Live balance of an account = opening + sum of its signed transactions. */
export function accountBalance(account: Account, txs: Transaction[]): number {
  return txs
    .filter((t) => t.accountId === account.id)
    .reduce((sum, t) => sum + signed(t), account.openingBalance);
}

export function totals(txs: Transaction[]) {
  let income = 0;
  let expense = 0;
  for (const t of txs) {
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, net: income - expense };
}

export interface CategorySlice {
  categoryId: string;
  total: number;
  count: number;
}

/** Percent change of `current` vs `previous`. null when previous is 0. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Sum expenses per category (ignores transfers, which have no real category spend impact). */
export function spendByCategory(txs: Transaction[]): CategorySlice[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const t of txs) {
    if (t.type !== "expense" || t.transferId) continue;
    const cur = map.get(t.categoryId) ?? { total: 0, count: 0 };
    cur.total += t.amount;
    cur.count += 1;
    map.set(t.categoryId, cur);
  }
  return [...map.entries()]
    .map(([categoryId, v]) => ({ categoryId, total: v.total, count: v.count }))
    .sort((a, b) => b.total - a.total);
}
