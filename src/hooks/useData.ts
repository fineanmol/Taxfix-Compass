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

export function useBudgets() {
  return useLiveQuery(() => db.budgets.toArray(), [], []);
}

export function useRecurring() {
  return useLiveQuery(() => db.recurring.toArray(), [], []);
}

export function useGroups() {
  return useLiveQuery(() => db.groups.toArray(), [], []);
}
