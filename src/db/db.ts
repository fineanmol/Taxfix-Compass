import Dexie, { type Table } from "dexie";
import type {
  Account,
  Budget,
  Category,
  Recurring,
  Settings,
  Transaction,
} from "./types";

export class ExpenseDB extends Dexie {
  accounts!: Table<Account, string>;
  categories!: Table<Category, string>;
  transactions!: Table<Transaction, string>;
  budgets!: Table<Budget, string>;
  recurring!: Table<Recurring, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super("quanto-clone");
    this.version(1).stores({
      accounts: "id, name, archived, createdAt",
      categories: "id, type, order",
      transactions: "id, type, categoryId, accountId, date, recurringId, transferId",
      budgets: "id, categoryId",
      recurring: "id, nextRun",
      settings: "id",
    });
    // v2: index importHash for statement-import dedup (additive migration)
    this.version(2).stores({
      transactions:
        "id, type, categoryId, accountId, date, recurringId, transferId, importHash",
    });
  }
}

export const db = new ExpenseDB();
