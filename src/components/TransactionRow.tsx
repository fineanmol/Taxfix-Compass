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
  // hide the note subtitle when it just repeats the category name
  const showNote = tx.note && tx.note.toLowerCase() !== (category?.name ?? "").toLowerCase();
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-[13px] px-4 py-[11px] text-left transition active:bg-surface-2"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: color + "22", color }}
      >
        <CategoryIcon name={category?.icon ?? "Circle"} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[17px] text-content">
          {category?.name ?? "Uncategorized"}
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
