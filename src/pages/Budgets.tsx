import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, X, Target } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { SwipeToDelete } from "@/components/SwipeToDelete";
import { EmptyState, IconButton } from "@/components/ui";
import { useBudgets, useCategories, useTransactionsInRange } from "@/hooks/useData";
import { useSettings } from "@/store/useSettings";
import { rangeBounds } from "@/lib/dates";
import { formatMoney, maskMoney } from "@/lib/money";
import { upsertBudget, deleteBudget } from "@/db/mutations";

export default function Budgets() {
  const navigate = useNavigate();
  const budgets = useBudgets();
  const categories = useCategories();
  const settings = useSettings((s) => s.settings);

  const now = useMemo(() => Date.now(), []);
  const { start, end } = useMemo(
    () => rangeBounds("month", now, settings?.monthStartDay ?? 1),
    [now, settings?.monthStartDay]
  );
  const monthTx = useTransactionsInRange(start, end);

  const hide = settings?.hideBalances ?? false;
  const currency = settings?.currency ?? "USD";
  const [showAdd, setShowAdd] = useState(false);

  const fmt = (n: number) => (hide ? maskMoney(formatMoney(n, currency)) : formatMoney(n, currency));

  const spentByCat = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of monthTx) {
      if (t.type === "expense" && !t.transferId)
        m.set(t.categoryId, (m.get(t.categoryId) ?? 0) + t.amount);
    }
    return m;
  }, [monthTx]);

  const expenseCats = categories.filter((c) => c.type === "expense");
  const budgetedCatIds = new Set(budgets.map((b) => b.categoryId));
  const available = expenseCats.filter((c) => !budgetedCatIds.has(c.id));

  return (
    <div className="safe-top space-y-4 px-4 pt-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-content">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface shadow-card">
            <ArrowLeft size={18} />
          </span>
          <span className="text-2xl font-bold tracking-tight">Budgets</span>
        </button>
        <IconButton
          icon={Plus}
          label="Add budget"
          variant="primary"
          disabled={available.length === 0}
          onClick={() => setShowAdd(true)}
        />
      </div>

      {budgets.length === 0 && (
        <EmptyState
          icon={Target}
          title="No budgets yet"
          hint="Set a monthly limit on a category to track spending against it."
          action={
            available.length > 0 ? (
              <button onClick={() => setShowAdd(true)} className="btn-primary px-5">
                Add a budget
              </button>
            ) : undefined
          }
        />
      )}

      <div className="space-y-3">
        {budgets.map((b) => {
          const cat = categories.find((c) => c.id === b.categoryId);
          const spent = spentByCat.get(b.categoryId) ?? 0;
          const pct = b.amount ? Math.min(100, Math.round((spent / b.amount) * 100)) : 0;
          const over = spent > b.amount;
          return (
            <SwipeToDelete key={b.id} onDelete={() => deleteBudget(b.id)}>
              <div className="p-4">
                <div className="mb-2 flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{ backgroundColor: (cat?.color ?? "#888") + "22", color: cat?.color }}
                  >
                    <CategoryIcon name={cat?.icon ?? "Circle"} size={18} />
                  </span>
                  <span className="flex-1 font-medium text-content">{cat?.name}</span>
                  <span className={`text-sm font-semibold ${over ? "text-red-500" : "text-muted"}`}>
                    {fmt(spent)} / {fmt(b.amount)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className={`h-full rounded-full ${over ? "bg-red-500" : "bg-brand-600"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </SwipeToDelete>
          );
        })}
      </div>

      {showAdd && (
        <AddBudgetSheet
          categories={available}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}

function AddBudgetSheet({
  categories,
  onClose,
}: {
  categories: { id: string; name: string }[];
  onClose: () => void;
}) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [amount, setAmount] = useState("");

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/30" onClick={onClose}>
      <div className="safe-bottom w-full max-w-md rounded-t-3xl bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-content">New budget</h2>
          <button onClick={onClose} className="text-faint"><X size={22} /></button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Category</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input">
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Monthly limit</span>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="input" />
          </label>
          <button
            disabled={!categoryId || !amount || Number(amount) <= 0}
            onClick={async () => {
              await upsertBudget({ categoryId, amount: Number(amount), period: "monthly" });
              onClose();
            }}
            className="btn-primary w-full disabled:opacity-40"
          >
            Save budget
          </button>
        </div>
      </div>
    </div>
  );
}
