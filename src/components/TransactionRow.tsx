import { CategoryIcon } from "./CategoryIcon";
import type { Category, Transaction } from "@/db/types";
import { formatMoney, maskMoney } from "@/lib/money";

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
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left active:bg-surface-2 transition"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: color + "22", color }}
      >
        <CategoryIcon name={category?.icon ?? "Circle"} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-content">
          {category?.name ?? "Uncategorized"}
        </span>
        {tx.note && <span className="block truncate text-xs text-faint">{tx.note}</span>}
      </span>
      <span
        className={`shrink-0 font-semibold ${
          tx.type === "income" ? "text-green-600" : "text-content"
        }`}
      >
        {tx.type === "income" ? "+" : "−"}
        {display}
      </span>
    </button>
  );
}
