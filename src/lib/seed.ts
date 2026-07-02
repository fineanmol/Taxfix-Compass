import { db } from "@/db/db";
import type { Account, Category, Settings } from "@/db/types";
import { uid } from "./id";

// Emoji icons + Apple system colors — vibrant, native on iPhone.
const DEFAULT_EXPENSE_CATEGORIES: Array<Pick<Category, "name" | "icon" | "color">> = [
  { name: "Food & Drink", icon: "🍔", color: "#FF9500" },
  { name: "Groceries", icon: "🛒", color: "#FF3B30" },
  { name: "Transport", icon: "🚗", color: "#0066CC" },
  { name: "Shopping", icon: "🛍️", color: "#5AC8FA" },
  { name: "Bills", icon: "🧾", color: "#FF2D55" },
  { name: "Rent", icon: "🏠", color: "#5856D6" },
  { name: "Utilities", icon: "💡", color: "#FFCC00" },
  { name: "Entertainment", icon: "🎬", color: "#AF52DE" },
  { name: "Health", icon: "❤️‍🩹", color: "#34C759" },
  { name: "Fitness", icon: "🏋️", color: "#30B0C7" },
  { name: "Travel", icon: "✈️", color: "#00C7BE" },
  { name: "Coffee", icon: "☕", color: "#A2845E" },
  { name: "Education", icon: "🎓", color: "#5856D6" },
  { name: "Subscriptions", icon: "🔁", color: "#FF375F" },
  { name: "Pets", icon: "🐾", color: "#FF9F0A" },
  { name: "Kids", icon: "🍼", color: "#64D2FF" },
  { name: "Gifts", icon: "🎁", color: "#BF5AF2" },
  { name: "Personal Care", icon: "💇", color: "#FF6482" },
  { name: "Fuel", icon: "⛽", color: "#8E8E93" },
  { name: "Taxes", icon: "🏛️", color: "#636366" },
  { name: "Other", icon: "📦", color: "#8E8E93" },
];

const DEFAULT_INCOME_CATEGORIES: Array<Pick<Category, "name" | "icon" | "color">> = [
  { name: "Salary", icon: "💰", color: "#34C759" },
  { name: "Freelance", icon: "💼", color: "#0066CC" },
  { name: "Business", icon: "🏢", color: "#5856D6" },
  { name: "Investments", icon: "📈", color: "#00C7BE" },
  { name: "Interest", icon: "🏦", color: "#30B0C7" },
  { name: "Refund", icon: "↩️", color: "#FF9500" },
  { name: "Gift", icon: "🎁", color: "#AF52DE" },
  { name: "Other", icon: "📦", color: "#8E8E93" },
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
