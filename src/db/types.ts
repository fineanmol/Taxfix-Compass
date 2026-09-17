export type TxType = "expense" | "income";
export type AccountType = "cash" | "checking" | "savings" | "credit" | "other";
export type BudgetPeriod = "monthly" | "weekly";
export type RecurInterval = "daily" | "weekly" | "monthly" | "yearly";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string; // ISO 4217, e.g. "USD"
  /** opening balance; live balance is derived from transactions */
  openingBalance: number;
  archived?: boolean;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  /** lucide icon name, e.g. "ShoppingCart" */
  icon: string;
  color: string; // hex
  type: TxType;
  order: number;
}

export interface Transaction {
  id: string;
  amount: number; // always positive; sign implied by `type`
  type: TxType;
  categoryId: string;
  accountId: string;
  date: number; // epoch ms
  note?: string;
  currency: string;
  /** set when this tx was materialized from a recurring rule */
  recurringId?: string;
  /** links the two legs of a transfer */
  transferId?: string;
  /** stable fingerprint for statement-import dedup (date+amount+desc+account) */
  importHash?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  period: BudgetPeriod;
  createdAt: number;
}

export interface Recurring {
  id: string;
  amount: number;
  type: TxType;
  categoryId: string;
  accountId: string;
  currency: string;
  note?: string;
  interval: RecurInterval;
  /** epoch ms of the next occurrence still to be created */
  nextRun: number;
  /** optional end; undefined = forever */
  until?: number;
  createdAt: number;
}

/** A learned rule: transactions whose note contains `merchant` → this category. */
export interface MerchantRule {
  id: string;
  merchant: string; // lowercased keyword, e.g. "hallesche"
  categoryId: string;
  createdAt: number;
}

/** A user-defined group/tag that clubs categories and/or merchants together. */
export interface Group {
  id: string;
  name: string;
  color: string;
  icon: string; // emoji
  categoryIds: string[];
  merchants: string[]; // lowercased note keywords, e.g. ["advanzia"]
  createdAt: number;
}

export type ThemePref = "light" | "dark" | "system";

export interface Settings {
  id: "app"; // singleton row
  currency: string;
  monthStartDay: number; // 1..28
  hideBalances: boolean;
  syncEnabled: boolean;
  theme: ThemePref;
  lastSyncAt?: number;
  /** When true, sample/mock transactions are loaded for testing. */
  mockDataMode?: boolean;
}
