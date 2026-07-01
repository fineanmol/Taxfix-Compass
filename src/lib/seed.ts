import { db } from "@/db/db";
import type { Account, Category, Settings } from "@/db/types";
import { uid } from "./id";

// Apple system colors — vibrant, reads well on light & dark (matches Quanto tiles).
const DEFAULT_EXPENSE_CATEGORIES: Array<Pick<Category, "name" | "icon" | "color">> = [
  { name: "Food & Drink", icon: "UtensilsCrossed", color: "#FF9500" }, // orange
  { name: "Groceries", icon: "ShoppingCart", color: "#FF3B30" }, // red
  { name: "Transport", icon: "Car", color: "#0066CC" }, // Science Blue
  { name: "Shopping", icon: "ShoppingBag", color: "#5AC8FA" }, // light blue
  { name: "Bills", icon: "ReceiptText", color: "#FF2D55" }, // pink
  { name: "Entertainment", icon: "Clapperboard", color: "#AF52DE" }, // purple
  { name: "Health", icon: "HeartPulse", color: "#34C759" }, // green
  { name: "Home", icon: "Home", color: "#5856D6" }, // indigo
  { name: "Travel", icon: "Plane", color: "#00C7BE" }, // teal
  { name: "Other", icon: "MoreHorizontal", color: "#8E8E93" }, // gray
];

const DEFAULT_INCOME_CATEGORIES: Array<Pick<Category, "name" | "icon" | "color">> = [
  { name: "Salary", icon: "Wallet", color: "#34C759" }, // green
  { name: "Gift", icon: "Gift", color: "#AF52DE" }, // purple
  { name: "Interest", icon: "TrendingUp", color: "#00C7BE" }, // teal
  { name: "Other", icon: "MoreHorizontal", color: "#8E8E93" },
];

/** Idempotent: seeds defaults only on first run (empty DB). */
export async function ensureSeeded(): Promise<void> {
  const settings = await db.settings.get("app");
  if (settings) return; // already initialized

  const now = Date.now();

  const defaultSettings: Settings = {
    id: "app",
    currency: "USD",
    monthStartDay: 1,
    hideBalances: false,
    syncEnabled: false,
    theme: "system",
  };

  const defaultAccount: Account = {
    id: uid(),
    name: "Cash",
    type: "cash",
    currency: "USD",
    openingBalance: 0,
    createdAt: now,
  };

  const categories: Category[] = [
    ...DEFAULT_EXPENSE_CATEGORIES.map((c, i) => ({
      id: uid(),
      type: "expense" as const,
      order: i,
      ...c,
    })),
    ...DEFAULT_INCOME_CATEGORIES.map((c, i) => ({
      id: uid(),
      type: "income" as const,
      order: i,
      ...c,
    })),
  ];

  await db.transaction("rw", db.settings, db.accounts, db.categories, async () => {
    await db.settings.put(defaultSettings);
    await db.accounts.put(defaultAccount);
    await db.categories.bulkPut(categories);
  });
}
