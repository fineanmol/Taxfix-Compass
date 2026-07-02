import { db } from "./db";
import type {
  Account,
  Budget,
  Category,
  Recurring,
  Transaction,
  TxType,
} from "./types";
import { uid } from "@/lib/id";

// ---- Transactions ----

export interface NewTxInput {
  amount: number;
  type: TxType;
  categoryId: string;
  accountId: string;
  date: number;
  note?: string;
  currency: string;
}

export async function addTransaction(input: NewTxInput): Promise<string> {
  const now = Date.now();
  const tx: Transaction = {
    id: uid(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  await db.transactions.put(tx);
  return tx.id;
}

export async function updateTransaction(
  id: string,
  patch: Partial<Omit<Transaction, "id" | "createdAt">>
): Promise<void> {
  await db.transactions.update(id, { ...patch, updatedAt: Date.now() });
}

export async function deleteTransaction(id: string): Promise<void> {
  const tx = await db.transactions.get(id);
  // delete both legs of a transfer together
  if (tx?.transferId) {
    await db.transactions.where("transferId").equals(tx.transferId).delete();
  } else {
    await db.transactions.delete(id);
  }
}

/** A transfer creates two linked legs: an expense on `from`, income on `to`. */
export async function addTransfer(params: {
  amount: number;
  fromAccountId: string;
  toAccountId: string;
  date: number;
  currency: string;
  note?: string;
  transferCategoryId: string;
}): Promise<void> {
  const now = Date.now();
  const transferId = uid();
  const base = {
    amount: params.amount,
    categoryId: params.transferCategoryId,
    date: params.date,
    currency: params.currency,
    note: params.note,
    transferId,
    createdAt: now,
    updatedAt: now,
  };
  await db.transactions.bulkPut([
    { id: uid(), type: "expense", accountId: params.fromAccountId, ...base },
    { id: uid(), type: "income", accountId: params.toAccountId, ...base },
  ]);
}

// ---- Currency ----

/**
 * Relabel every account, transaction and recurring rule to a new currency code.
 * This is a display relabel (no FX conversion) — appropriate for a manual
 * tracker where the user simply wants their money shown in one currency.
 * Returns how many rows were touched.
 */
export async function relabelCurrency(to: string): Promise<number> {
  return db.transaction("rw", db.accounts, db.transactions, db.recurring, async () => {
    const [accs, txs, recs] = await Promise.all([
      db.accounts.toArray(),
      db.transactions.toArray(),
      db.recurring.toArray(),
    ]);
    await db.accounts.bulkPut(accs.map((a) => ({ ...a, currency: to })));
    await db.transactions.bulkPut(txs.map((t) => ({ ...t, currency: to, updatedAt: Date.now() })));
    await db.recurring.bulkPut(recs.map((r) => ({ ...r, currency: to })));
    return accs.length + txs.length + recs.length;
  });
}

// ---- Accounts ----

export async function addAccount(input: Omit<Account, "id" | "createdAt">): Promise<string> {
  const acc: Account = { id: uid(), createdAt: Date.now(), ...input };
  await db.accounts.put(acc);
  return acc.id;
}
export const updateAccount = (id: string, patch: Partial<Account>) =>
  db.accounts.update(id, patch);
export const deleteAccount = (id: string) => db.accounts.delete(id);

// ---- Categories ----

export async function addCategory(input: Omit<Category, "id" | "order">): Promise<string> {
  const count = await db.categories.where("type").equals(input.type).count();
  const cat: Category = { id: uid(), order: count, ...input };
  await db.categories.put(cat);
  return cat.id;
}
export const updateCategory = (id: string, patch: Partial<Category>) =>
  db.categories.update(id, patch);

/** Persist a new ordering for a set of category ids (index becomes `order`). */
export async function reorderCategories(orderedIds: string[]): Promise<void> {
  await db.transaction("rw", db.categories, async () => {
    await Promise.all(orderedIds.map((id, i) => db.categories.update(id, { order: i })));
  });
}
export const deleteCategory = (id: string) => db.categories.delete(id);

// ---- Budgets ----

export async function upsertBudget(input: Omit<Budget, "id" | "createdAt">): Promise<void> {
  const existing = await db.budgets.where("categoryId").equals(input.categoryId).first();
  if (existing) {
    await db.budgets.update(existing.id, { amount: input.amount, period: input.period });
  } else {
    await db.budgets.put({ id: uid(), createdAt: Date.now(), ...input });
  }
}
export const deleteBudget = (id: string) => db.budgets.delete(id);

// ---- Recurring ----

export async function addRecurring(input: Omit<Recurring, "id" | "createdAt">): Promise<string> {
  const r: Recurring = { id: uid(), createdAt: Date.now(), ...input };
  await db.recurring.put(r);
  return r.id;
}
export const deleteRecurring = (id: string) => db.recurring.delete(id);
