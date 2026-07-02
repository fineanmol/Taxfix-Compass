import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Target, Wallet } from "lucide-react";
import { PeriodSwitcher } from "@/components/PeriodSwitcher";
import { SpendDonut } from "@/components/SpendDonut";
import { TransactionRow } from "@/components/TransactionRow";
import { CategoryIcon } from "@/components/CategoryIcon";
import { useCategories, useTransactionsInRange } from "@/hooks/useData";
import { useSettings } from "@/store/useSettings";
import { spendByCategory, totals, percentChange } from "@/lib/calc";
import { formatMoney, maskMoney } from "@/lib/money";
import { rangeBounds, prevRangeBounds, prevPeriodLabel, type RangeKey } from "@/lib/dates";

export default function Dashboard() {
  const navigate = useNavigate();
  const settings = useSettings((s) => s.settings);
  const toggleHide = useSettings((s) => s.toggleHideBalances);
  const categories = useCategories();

  const [range, setRange] = useState<RangeKey>("month");
  const now = useMemo(() => Date.now(), []);
  const monthStart = settings?.monthStartDay ?? 1;
  const { start, end } = useMemo(
    () => rangeBounds(range, now, monthStart),
    [range, now, monthStart]
  );
  const prev = useMemo(() => prevRangeBounds(range, now, monthStart), [range, now, monthStart]);
  const txs = useTransactionsInRange(start, end);
  const prevTxs = useTransactionsInRange(prev.start, prev.end);

  const hide = settings?.hideBalances ?? false;
  const currency = settings?.currency ?? "USD";

  const { income, expense } = totals(txs);
  const prevExpense = totals(prevTxs).expense;
  const expensePct = percentChange(expense, prevExpense);
  const slices = spendByCategory(txs);
  const recent = [...txs].sort((a, b) => b.date - a.date).slice(0, 8);

  const net = income - expense;
  const fmt = (n: number) => (hide ? maskMoney(formatMoney(n, currency)) : formatMoney(n, currency));
  const periodWord =
    range === "week" ? "last 7 days" : range === "quarter" ? "last 90 days" : range === "year" ? "last year" : "last 30 days";

  return (
    <div className="safe-top space-y-4 px-4 pt-4">
      {/* header row: net for the selected window + hide toggle */}
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs text-faint">Net · {periodWord}</p>
          <p className={`text-lg font-semibold ${net >= 0 ? "text-mint" : "text-content"}`}>
            {net >= 0 ? "+" : "−"}
            {fmt(Math.abs(net))}
          </p>
        </div>
        <button
          onClick={toggleHide}
          aria-label="Toggle balances"
          className="rounded-full bg-surface p-2.5 text-brand-600 shadow-card"
        >
          {hide ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </header>

      <PeriodSwitcher value={range} onChange={setRange} />

      {/* donut leads with 'Expenses this <period>' + comparison, like Quanto */}
      <div className="card p-4">
        <SpendDonut
          slices={slices}
          categories={categories}
          currency={currency}
          hideBalances={hide}
          centerLabel={`Spent · ${periodWord}`}
          pct={expensePct}
          comparisonLabel={prevPeriodLabel(range, now, monthStart)}
        />

        {/* legend: icon · name · count · amount · % */}
        <div className="mt-2 space-y-0.5">
          {slices.slice(0, 6).map((s) => {
            const cat = categories.find((c) => c.id === s.categoryId);
            const pct = expense ? Math.round((s.total / expense) * 100) : 0;
            return (
              <button
                key={s.categoryId}
                onClick={() => navigate(`/detail?category=${s.categoryId}`)}
                className="flex w-full items-center gap-3 rounded-lg py-1.5 text-left active:bg-surface-2"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: (cat?.color ?? "#8E8E93") + "22",
                    color: cat?.color ?? "#8E8E93",
                  }}
                >
                  <CategoryIcon name={cat?.icon ?? "Circle"} size={16} />
                </span>
                <span className="font-medium text-content">{cat?.name ?? "Other"}</span>
                <span className="rounded-full bg-surface-2 px-1.5 text-[11px] font-medium text-faint">
                  {s.count}
                </span>
                <span className="ml-auto font-semibold text-content">{fmt(s.total)}</span>
                <span className="w-10 text-right text-xs text-faint">{pct}%</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* income / expense pills */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-xs text-faint">Income</p>
          <p className="text-lg font-semibold text-mint">{fmt(income)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-faint">Expenses</p>
          <p className="text-lg font-semibold text-content">{fmt(expense)}</p>
        </div>
      </div>

      {/* shortcuts */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate("/budgets")}
          className="card flex items-center gap-3 p-4 active:bg-surface-2"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-brand-600">
            <Target size={20} />
          </span>
          <span className="flex-1 text-left font-medium text-content">Budgets</span>
        </button>
        <button
          onClick={() => navigate("/accounts")}
          className="card flex items-center gap-3 p-4 active:bg-surface-2"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-brand-600">
            <Wallet size={20} />
          </span>
          <span className="flex-1 text-left font-medium text-content">Accounts</span>
        </button>
      </div>

      {/* recent */}
      <section>
        <div className="mb-1 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-muted">Recent</h2>
          {recent.length > 0 && (
            <button onClick={() => navigate("/transactions")} className="text-sm text-brand-600">
              See all →
            </button>
          )}
        </div>
        <div className="card divide-y divide-line p-1">
          {recent.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-faint">
              No transactions yet. Tap + to add one.
            </p>
          )}
          {recent.map((tx) => (
            <TransactionRow
              key={tx.id}
              tx={tx}
              category={categories.find((c) => c.id === tx.categoryId)}
              hideBalances={hide}
              onClick={() => navigate(`/edit/${tx.id}`)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
