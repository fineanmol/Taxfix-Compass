import { CategoryIcon } from "./CategoryIcon";
import type { Category, Transaction } from "@/db/types";
import { formatMoney, maskMoney } from "@/lib/money";
import { isPayrollCategoryName } from "@/lib/payroll";

export function TransactionRow({
  tx,
  category,
  hideBalances,
  onClick,
}: {
  tx: Transaction;
  category?: Category;
  hideBalances: boolean;
  onClick?: () => void;
}) {
  const money = formatMoney(tx.amount, tx.currency);
  const display = hideBalances ? maskMoney(money) : money;
  const color = category?.color ?? "#64748b";
  // hide the note subtitle when it just repeats the category name
  const demo = (tx.note ?? "").startsWith("[sample]");
  const payroll = isPayrollCategoryName(category?.name);
  const emphasize = demo || payroll;
  const showNote = tx.note && tx.note.toLowerCase() !== (category?.name ?? "").toLowerCase();
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-[13px] px-4 py-[11px] text-left transition active:bg-surface-2 ${
        emphasize ? "bg-brand-500/10" : ""
      }`}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: color + "22", color }}
      >
        <CategoryIcon name={category?.icon ?? "Circle"} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="block truncate text-[17px] text-content">
            {category?.name ?? "Uncategorized"}
          </span>
          {payroll && (
            <span className="shrink-0 rounded-md bg-brand-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-600">
              Payroll
            </span>
          )}
          {demo && !payroll && (
            <span className="shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-faint">
              Demo
            </span>
          )}
        </span>
        {showNote && <span className="block truncate text-[13px] text-faint">{tx.note}</span>}
      </span>
      <span
        className={`shrink-0 text-[17px] ${
          tx.type === "income" ? "text-mint" : "text-content"
        }`}
      >
        {tx.type === "income" ? "+" : "−"}
        {display}
      </span>
    </button>
  );
}
