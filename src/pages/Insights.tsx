import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { TransactionRow } from "@/components/TransactionRow";
import { ActivityFilters, type Filters, type SortKey } from "@/components/FilterChips";
import { ActivityChart } from "@/components/ActivityChart";
import { ComparisonPill } from "@/components/ComparisonPill";
import { MonthPicker } from "@/components/MonthPicker";
import {
  useAccounts,
  useCategories,
  useTransactionsInRange,
  useLatestMonthWithData,
} from "@/hooks/useData";
import { useSettings } from "@/store/useSettings";
import { fmtDayHeader } from "@/lib/dates";
import { formatMoney, maskMoney } from "@/lib/money";
import { percentChange } from "@/lib/calc";
import type { Transaction } from "@/db/types";

/** Activity: main screen — monthly bar chart + filters + transaction list. */
export default function Activity() {
  const navigate = useNavigate();
  const settings = useSettings((s) => s.settings);
  const categories = useCategories();
  const accounts = useAccounts();
  const latestMonth = useLatestMonthWithData();

  const [month, setMonth] = useState<number | null>(null);
  useEffect(() => {
    if (month === null && latestMonth) setMonth(latestMonth);
  }, [latestMonth, month]);
  const activeMonth = month ?? latestMonth ?? dayjs().startOf("month").valueOf();

  const [filters, setFilters] = useState<Filters>({
    txType: "expense",
    range: "month",
    accountId: "all",
    categoryId: "all",
    sort: "date-desc",
  });
  const [q, setQ] = useState("");

  const start = dayjs(activeMonth).startOf("month");
  const end = dayjs(activeMonth).endOf("month");
  const prevStart = start.subtract(1, "month");
  const prevEnd = start.subtract(1, "millisecond");

  const txs = useTransactionsInRange(start.valueOf(), end.valueOf());
  const prevTxs = useTransactionsInRange(prevStart.valueOf(), prevEnd.valueOf());

  const hide = settings?.hideBalances ?? false;
  const currency = settings?.currency ?? "USD";

  const mq = q.trim().toLowerCase();
  const catName = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name.toLowerCase()])),
    [categories]
  );
  const matches = (t: Transaction) =>
    (filters.txType === "all" || t.type === filters.txType) &&
    (filters.accountId === "all" || t.accountId === filters.accountId) &&
    (filters.categoryId === "all" || t.categoryId === filters.categoryId) &&
    (!mq ||
      (t.note ?? "").toLowerCase().includes(mq) ||
      (catName.get(t.categoryId) ?? "").includes(mq) ||
      String(t.amount).includes(mq)) &&
    !t.transferId;

  const filtered = useMemo(() => txs.filter(matches), [txs, filters, mq, catName]);
  const prevFiltered = useMemo(() => prevTxs.filter(matches), [prevTxs, filters, mq, catName]);

  const total = filtered.reduce((s, t) => s + t.amount, 0);
  const prevTotal = prevFiltered.reduce((s, t) => s + t.amount, 0);
  const pct = percentChange(total, prevTotal);

  const bars = useMemo(() => dailyBuckets(filtered, start), [filtered, start]);
  const grouped = useMemo(() => groupByDay(filtered, filters.sort), [filtered, filters.sort]);

  const totalStr = hide ? maskMoney(formatMoney(total, currency)) : formatMoney(total, currency);
  const label = filters.txType === "income" ? "Income" : "Expenses";

  return (
    <div className="safe-top space-y-5 px-4 pt-3">
      {/* header: month picker + big total + comparison */}
      <header className="flex flex-col items-center gap-1.5">
        <MonthPicker month={activeMonth} onChange={setMonth} />
        <p className="text-[40px] font-bold leading-none tracking-tight text-content">{totalStr}</p>
        <ComparisonPill pct={pct} label={prevStart.format("MMM")} />
      </header>

      {/* chart (floats on background, no card) */}
      {bars.some((b) => b.value > 0) ? (
        <ActivityChart bars={bars} currency={currency} />
      ) : (
        <p className="py-16 text-center text-sm text-faint">No {label.toLowerCase()} this month</p>
      )}

      {/* filters + search */}
      <ActivityFilters
        filters={filters}
        onChange={setFilters}
        accounts={accounts}
        categories={categories}
        search={q}
        onSearch={setQ}
      />

      {/* daily transaction lists */}
      <section className="space-y-5">
        {grouped.map(([day, items]) => {
          const dayTotal = items.reduce((s, t) => s + (t.type === "expense" ? t.amount : -t.amount), 0);
          const dt = hide
            ? maskMoney(formatMoney(Math.abs(dayTotal), currency))
            : formatMoney(Math.abs(dayTotal), currency);
          return (
            <div key={day}>
              <div className="mb-2 flex items-center justify-between px-1">
                <h3 className="text-[15px] font-medium text-faint">{fmtDayHeader(Number(day))}</h3>
                <span className="text-[15px] text-faint">
                  {dayTotal < 0 ? "−" : "+"}
                  {dt}
                </span>
              </div>
              <div className="overflow-hidden rounded-2xl bg-surface">
                {items.map((tx, i) => (
                  <div key={tx.id}>
                    {i > 0 && <div className="ml-[72px] h-px bg-line" />}
                    <TransactionRow
                      tx={tx}
                      category={categories.find((c) => c.id === tx.categoryId)}
                      hideBalances={hide}
                      onClick={() => navigate(`/edit/${tx.id}`)}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {grouped.length === 0 && (
          <p className="py-6 text-center text-sm text-faint">No transactions match these filters.</p>
        )}
      </section>
    </div>
  );
}

/** One bar per day of the month. */
function dailyBuckets(txs: Transaction[], monthStart: dayjs.Dayjs) {
  const days = monthStart.daysInMonth();
  const arr = Array.from({ length: days }, (_, i) => ({ label: String(i + 1), value: 0 }));
  for (const t of txs) arr[dayjs(t.date).date() - 1].value += t.amount;
  return arr;
}

function groupByDay(txs: Transaction[], sort: SortKey): [string, Transaction[]][] {
  const map = new Map<string, Transaction[]>();
  for (const t of txs) {
    const key = String(dayjs(t.date).startOf("day").valueOf());
    const arr = map.get(key) ?? [];
    arr.push(t);
    map.set(key, arr);
  }
  // within-day ordering
  const rowCmp =
    sort === "amount-asc"
      ? (x: Transaction, y: Transaction) => x.amount - y.amount
      : sort === "amount-desc"
        ? (x: Transaction, y: Transaction) => y.amount - x.amount
        : sort === "date-asc"
          ? (x: Transaction, y: Transaction) => x.date - y.date
          : (x: Transaction, y: Transaction) => y.date - x.date;
  // day ordering: amount sorts rank days by their total; date sorts by date
  const dayTotal = (rows: Transaction[]) => rows.reduce((s, t) => s + t.amount, 0);
  const entries: [string, Transaction[]][] = [...map.entries()].map(([k, v]) => [k, v.sort(rowCmp)]);
  entries.sort((a, b) => {
    if (sort === "amount-desc") return dayTotal(b[1]) - dayTotal(a[1]);
    if (sort === "amount-asc") return dayTotal(a[1]) - dayTotal(b[1]);
    if (sort === "date-asc") return Number(a[0]) - Number(b[0]);
    return Number(b[0]) - Number(a[0]);
  });
  return entries;
}
