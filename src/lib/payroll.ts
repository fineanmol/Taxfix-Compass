import type { Category } from "@/db/types";

/** Payroll categories shown on Summary and used by German payslip import. */
export const PAYROLL_INCOME_CATEGORIES: Array<Pick<Category, "name" | "icon" | "color">> = [
  { name: "Income", icon: "💰", color: "#34C759" },
];

export const PAYROLL_EXPENSE_CATEGORIES: Array<Pick<Category, "name" | "icon" | "color">> = [
  { name: "Income Tax", icon: "🏛️", color: "#636366" },
  { name: "Solidarity Surcharge", icon: "📑", color: "#8E8E93" },
  { name: "Church Tax", icon: "⛪", color: "#AF52DE" },
  { name: "Pension Insurance", icon: "🧓", color: "#5856D6" },
  { name: "Unemployment Insurance", icon: "☂️", color: "#668CFF" },
  { name: "Health Insurance", icon: "🩺", color: "#30B0C7" },
  { name: "Care Insurance", icon: "🫶", color: "#FF2D55" },
];

export const PAYROLL_INCOME_NAMES = PAYROLL_INCOME_CATEGORIES.map((c) => c.name);
export const PAYROLL_EXPENSE_NAMES = PAYROLL_EXPENSE_CATEGORIES.map((c) => c.name);

export function isPayrollCategoryName(name: string | undefined): boolean {
  if (!name) return false;
  return PAYROLL_INCOME_NAMES.includes(name) || PAYROLL_EXPENSE_NAMES.includes(name) || name === "Salary";
}

/** Income first, then tax/insurance in payslip order so Health Insurance stays visible. */
export const PAYROLL_DISPLAY_ORDER = [
  "Income",
  "Salary",
  "Income Tax",
  "Solidarity Surcharge",
  "Church Tax",
  "Pension Insurance",
  "Unemployment Insurance",
  "Health Insurance",
  "Care Insurance",
];

export function payrollDisplayRank(name: string | undefined): number {
  const i = PAYROLL_DISPLAY_ORDER.indexOf(name ?? "");
  return i === -1 ? 99 : i;
}
