import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Receipt } from "lucide-react";
import dayjs from "dayjs";
import { TransactionRow } from "@/components/TransactionRow";
import { SwipeToDelete } from "@/components/SwipeToDelete";
import { PageHeader, EmptyState } from "@/components/ui";
import { useAllTransactions, useCategories } from "@/hooks/useData";
import { useSettings } from "@/store/useSettings";
import { deleteTransaction } from "@/db/mutations";
import { formatMoney, maskMoney } from "@/lib/money";
import { fmtDayHeader } from "@/lib/dates";
import type { Transaction } from "@/db/types";

export default function Transactions() {
  const navigate = useNavigate();
  const all = useAllTransactions();
  const categories = useCategories();
  const settings = useSettings((s) => s.settings);
  const [q, setQ] = useState("");

  const hide = settings?.hideBalances ?? false;
  const currency = settings?.currency ?? "USD";
  const catName = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name.toLowerCase()])),
    [categories]
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return all;
    return all.filter(
      (t) =>
        (t.note ?? "").toLowerCase().includes(term) ||
        (catName.get(t.categoryId) ?? "").includes(term) ||
        String(t.amount).includes(term)
    );
  }, [all, q, catName]);

  const grouped = useMemo(() => groupByDay(filtered), [filtered]);

  return (
    <div className="safe-top space-y-4 px-4 pt-4">
      <PageHeader title="Transactions" subtitle={`${all.length} total`} />

      {/* search */}
      <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 shadow-card">
        <Search size={18} className="text-faint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search notes, categories, amounts…"
          className="w-full bg-transparent text-sm text-content outline-none placeholder:text-faint"
        />
      </div>

      {grouped.length === 0 && (
        <EmptyState
          icon={Receipt}
          title={q ? "No matches" : "No transactions yet"}
          hint={q ? "Try a different search." : "Tap the + button to add your first one."}
        />
      )}

      <section className="space-y-4 pb-4">
        {grouped.map(([day, items]) => {
          const dayTotal = items.reduce(
            (s, t) => s + (t.type === "expense" ? -t.amount : t.amount),
            0
          );
          const dt = hide
            ? maskMoney(formatMoney(Math.abs(dayTotal), currency))
            : formatMoney(Math.abs(dayTotal), currency);
          return (
            <div key={day}>
              <div className="mb-1 flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold text-muted">{fmtDayHeader(Number(day))}</h3>
                <span className="text-xs text-faint">
                  {dayTotal < 0 ? "−" : "+"}
                  {dt}
                </span>
              </div>
              <div className="card divide-y divide-line p-1">
                {items.map((tx) => (
                  <SwipeToDelete key={tx.id} onDelete={() => deleteTransaction(tx.id)}>
                    <TransactionRow
                      tx={tx}
                      category={categories.find((c) => c.id === tx.categoryId)}
                      hideBalances={hide}
                      onClick={() => navigate(`/edit/${tx.id}`)}
                    />
                  </SwipeToDelete>
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function groupByDay(txs: Transaction[]): [string, Transaction[]][] {
  const map = new Map<string, Transaction[]>();
  for (const t of txs) {
    const key = String(dayjs(t.date).startOf("day").valueOf());
    const arr = map.get(key) ?? [];
    arr.push(t);
    map.set(key, arr);
  }
  return [...map.entries()]
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([k, v]) => [k, v.sort((x, y) => y.date - x.date)]);
}
