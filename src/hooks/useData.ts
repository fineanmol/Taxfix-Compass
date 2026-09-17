import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";

export function useAccounts() {
  return useLiveQuery(() => db.accounts.toArray(), [], []);
}

export function useCategories() {
  return useLiveQuery(() => db.categories.orderBy("order").toArray(), [], []);
}

export function useTransactionsInRange(start: number, end: number) {
  return useLiveQuery(
    () => db.transactions.where("date").between(start, end, true, true).toArray(),
    [start, end],
    []
  );
}

export function useAllTransactions() {
  return useLiveQuery(() => db.transactions.orderBy("date").reverse().toArray(), [], []);
}

/** undefined while Dexie hydrates so empty-state CTAs don't flash. */
export function useTransactionCount(): number | undefined {
  return useLiveQuery(() => db.transactions.count(), []);
}

export function useBudgets() {
  return useLiveQuery(() => db.budgets.toArray(), [], []);
}

export function useRecurring() {
  return useLiveQuery(() => db.recurring.toArray(), [], []);
}

export function useGroups() {
  return useLiveQuery(() => db.groups.toArray(), [], []);
}

/** Epoch-ms of the start of the most recent month that has any transaction. */
export function useLatestMonthWithData(): number | undefined {
  return useLiveQuery(async () => {
    const last = await db.transactions.orderBy("date").last();
    const d = last ? new Date(last.date) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  }, []);
}
