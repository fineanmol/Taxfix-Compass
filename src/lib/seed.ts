import { db } from "@/db/db";
import type { Account, Category, Settings } from "@/db/types";
import { uid } from "./id";
import { CURRENCIES, DEFAULT_CURRENCY } from "./money";
import { PAYROLL_EXPENSE_CATEGORIES, PAYROLL_INCOME_CATEGORIES } from "./payroll";

// region → currency, limited to the currencies the app supports
const REGION_CURRENCY: Record<string, string> = {
  US: "USD", CA: "CAD", GB: "GBP", AU: "AUD", CH: "CHF", CN: "CNY", JP: "JPY",
  IN: "INR", AE: "AED",
  // Euro area
  DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", IE: "EUR", PT: "EUR",
  AT: "EUR", BE: "EUR", FI: "EUR", GR: "EUR", LT: "EUR", LV: "EUR", EE: "EUR",
  SK: "EUR", SI: "EUR", LU: "EUR", CY: "EUR", MT: "EUR",
};

/** Guess a supported currency from the browser locale; falls back to EUR. */
function guessLocaleCurrency(): string {
  try {
    const region =
      new Intl.Locale(navigator.language).maximize().region ??
      navigator.language.split("-")[1]?.toUpperCase();
    const code = region ? REGION_CURRENCY[region] : undefined;
    if (code && CURRENCIES.some((c) => c.code === code)) return code;
  } catch {
    /* ignore — fall through to EUR */
  }
  return DEFAULT_CURRENCY;
}

// Emoji icons + Apple system colors — vibrant, native on iPhone.
const DEFAULT_EXPENSE_CATEGORIES: Array<Pick<Category, "name" | "icon" | "color">> = [
  { name: "Food & Drink", icon: "🍔", color: "#FF9500" },
  { name: "Groceries", icon: "🛒", color: "#FF3B30" },
  { name: "Transport", icon: "🚗", color: "#36893B" },
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
  ...PAYROLL_EXPENSE_CATEGORIES,
  { name: "Other", icon: "📦", color: "#8E8E93" },
];

const DEFAULT_INCOME_CATEGORIES: Array<Pick<Category, "name" | "icon" | "color">> = [
  ...PAYROLL_INCOME_CATEGORIES,
  { name: "Salary", icon: "💰", color: "#32D74B" },
  { name: "Freelance", icon: "💼", color: "#36893B" },
  { name: "Business", icon: "🏢", color: "#5856D6" },
  { name: "Investments", icon: "📈", color: "#00C7BE" },
  { name: "Interest", icon: "🏦", color: "#30B0C7" },
  { name: "Refund", icon: "↩️", color: "#FF9500" },
  { name: "Repayment", icon: "🤝", color: "#32D74B" },
  { name: "Gift", icon: "🎁", color: "#AF52DE" },
  { name: "Other", icon: "📦", color: "#8E8E93" },
];

/** Idempotent: seeds defaults only on first run (empty DB). */
export async function ensureSeeded(): Promise<void> {
  const settings = await db.settings.get("app");
  if (settings) {
    // already initialized — top up any newly-shipped default categories
    await ensureDefaultCategories();
    return;
  }

  const now = Date.now();

  // Locale-aware first-run currency; falls back to EUR. Existing settings in IndexedDB are untouched.
  const defaultCurrency = guessLocaleCurrency();

  const defaultSettings: Settings = {
    id: "app",
    currency: defaultCurrency,
    monthStartDay: 1,
    hideBalances: false,
    syncEnabled: false,
    theme: "system",
  };

  const defaultAccount: Account = {
    id: uid(),
    name: "Cash",
    type: "cash",
    currency: defaultCurrency, // same as settings so imports show the right currency
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

/** Add any built-in default categories that don't exist yet (by name+type). */
async function ensureDefaultCategories(): Promise<void> {
  const existing = await db.categories.toArray();
  const has = (name: string, type: "expense" | "income") =>
    existing.some((c) => c.name === name && c.type === type);

  const toAdd: Category[] = [];
  let expOrder = existing.filter((c) => c.type === "expense").length;
  let incOrder = existing.filter((c) => c.type === "income").length;

  for (const c of DEFAULT_EXPENSE_CATEGORIES) {
    if (!has(c.name, "expense"))
      toAdd.push({ id: uid(), type: "expense", order: expOrder++, ...c });
  }
  for (const c of DEFAULT_INCOME_CATEGORIES) {
    if (!has(c.name, "income"))
      toAdd.push({ id: uid(), type: "income", order: incOrder++, ...c });
  }
  if (toAdd.length) await db.categories.bulkPut(toAdd);
}
