import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Receipt, CheckCircle2, Circle, X, Tag, Trash2 } from "lucide-react";
import dayjs from "dayjs";
import { TransactionRow } from "@/components/TransactionRow";
import { SwipeToDelete } from "@/components/SwipeToDelete";
import { CategoryIcon } from "@/components/CategoryIcon";
import { PageHeader, EmptyState } from "@/components/ui";
import { useAllTransactions, useCategories } from "@/hooks/useData";
import { useSettings } from "@/store/useSettings";
import {
  deleteTransaction,
  bulkSetCategory,
  bulkDeleteTransactions,
} from "@/db/mutations";
import { formatMoney, maskMoney } from "@/lib/money";
import { fmtDayHeader } from "@/lib/dates";
import type { Transaction } from "@/db/types";

export default function Transactions() {
  const navigate = useNavigate();
  const all = useAllTransactions();
  const categories = useCategories();
  const settings = useSettings((s) => s.settings);
  const [q, setQ] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCatPicker, setShowCatPicker] = useState(false);

  const hide = settings?.hideBalances ?? false;
  const currency = settings?.currency ?? "EUR";
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

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function exitSelect() {
    setSelectMode(false);
    setSelected(new Set());
  }
  function selectAllVisible() {
    setSelected(new Set(filtered.map((t) => t.id)));
  }

  async function applyCategory(categoryId: string) {
    await bulkSetCategory([...selected], categoryId);
    setShowCatPicker(false);
    exitSelect();
  }
  async function deleteSelected() {
    if (confirm(`Delete ${selected.size} selected transaction(s)?`)) {
      await bulkDeleteTransactions([...selected]);
      exitSelect();
    }
  }

  return (
    <div className="safe-top space-y-4 px-4 pt-4">
      <PageHeader
        title="Transactions"
        subtitle={`${all.length} total`}
        action={
          <button
            onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
            className="text-sm font-medium text-brand-600"
          >
            {selectMode ? "Cancel" : "Select"}
          </button>
        }
      />

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

      {selectMode && (
        <div className="flex items-center justify-between px-1 text-sm">
          <span className="text-muted">{selected.size} selected</span>
          <button onClick={selectAllVisible} className="text-brand-600">
            Select all ({filtered.length})
          </button>
        </div>
      )}

      {grouped.length === 0 && (
        <EmptyState
          icon={Receipt}
          title={q ? "No matches" : "No transactions yet"}
          hint={q ? "Try a different search." : "Tap the + button to add your first one."}
        />
      )}

      <section className={`space-y-4 ${selectMode ? "pb-28" : "pb-4"}`}>
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
                {items.map((tx) =>
                  selectMode ? (
                    <button
                      key={tx.id}
                      onClick={() => toggle(tx.id)}
                      className="flex w-full items-center gap-2 rounded-xl px-2 py-1 text-left active:bg-surface-2"
                    >
                      {selected.has(tx.id) ? (
                        <CheckCircle2 size={20} className="shrink-0 text-brand-600" />
                      ) : (
                        <Circle size={20} className="shrink-0 text-faint" />
                      )}
                      <div className="min-w-0 flex-1">
                        <TransactionRow
                          tx={tx}
                          category={categories.find((c) => c.id === tx.categoryId)}
                          hideBalances={hide}
                        />
                      </div>
                    </button>
                  ) : (
                    <SwipeToDelete key={tx.id} onDelete={() => deleteTransaction(tx.id)}>
                      <TransactionRow
                        tx={tx}
                        category={categories.find((c) => c.id === tx.categoryId)}
                        hideBalances={hide}
                        onClick={() => navigate(`/edit/${tx.id}`)}
                      />
                    </SwipeToDelete>
                  )
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* bulk action bar */}
      {selectMode && selected.size > 0 && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur">
          <div className="mx-auto flex max-w-md gap-2 p-3">
            <button onClick={() => setShowCatPicker(true)} className="btn-primary flex flex-1 items-center justify-center gap-2">
              <Tag size={18} /> Set category ({selected.size})
            </button>
            <button
              onClick={deleteSelected}
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-line text-red-500"
              aria-label="Delete selected"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      )}

      {/* category picker sheet */}
      {showCatPicker && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={() => setShowCatPicker(false)}>
          <div className="safe-bottom max-h-[70vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-content">Move {selected.size} to…</h2>
              <button onClick={() => setShowCatPicker(false)} className="text-faint"><X size={22} /></button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => applyCategory(c.id)}
                  className="flex flex-col items-center gap-1"
                >
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: c.color + "22" }}
                  >
                    <CategoryIcon name={c.icon} size={22} />
                  </span>
                  <span className="line-clamp-1 text-[11px] text-muted">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
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
