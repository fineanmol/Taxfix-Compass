import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import dayjs from "dayjs";
import { TransactionRow } from "@/components/TransactionRow";
import { FilterChips, type Filters } from "@/components/FilterChips";
import { ComparisonPill } from "@/components/ComparisonPill";
import { useAccounts, useCategories, useTransactionsInRange } from "@/hooks/useData";
import { useSettings } from "@/store/useSettings";
import {
  rangeBounds,
  prevRangeBounds,
  prevPeriodLabel,
  type RangeKey,
  fmtDayHeader,
} from "@/lib/dates";
import { formatMoney, maskMoney } from "@/lib/money";
import { percentChange } from "@/lib/calc";
import { isDark } from "@/lib/theme";
import type { Transaction } from "@/db/types";

export default function Insights() {
  const settings = useSettings((s) => s.settings);
  const categories = useCategories();
  const accounts = useAccounts();

  const [filters, setFilters] = useState<Filters>({
    txType: "expense",
    range: "month",
    accountId: "all",
    categoryId: "all",
  });

  const dark = isDark(settings?.theme ?? "system");
  // White bars on dark (Quanto look), Shark bars on light.
  const chart = dark
    ? { bar: "#f5f5f7", cursor: "rgba(255,255,255,0.06)", tip: "#1c1c1e", tipBorder: "#38383a", label: "#98989d", grid: "#48484a" }
    : { bar: "#1d1d1f", cursor: "rgba(0,0,0,0.04)", tip: "#ffffff", tipBorder: "#e2e2e7", label: "#98989d", grid: "#c7c7cc" };

  const now = useMemo(() => Date.now(), []);
  const monthStart = settings?.monthStartDay ?? 1;
  const { start, end } = useMemo(
    () => rangeBounds(filters.range, now, monthStart),
    [filters.range, now, monthStart]
  );
  const prev = useMemo(
    () => prevRangeBounds(filters.range, now, monthStart),
    [filters.range, now, monthStart]
  );

  const txs = useTransactionsInRange(start, end);
  const prevTxs = useTransactionsInRange(prev.start, prev.end);

  const hide = settings?.hideBalances ?? false;
  const currency = settings?.currency ?? "USD";

  const matches = (t: Transaction) =>
    (filters.txType === "all" || t.type === filters.txType) &&
    (filters.accountId === "all" || t.accountId === filters.accountId) &&
    (filters.categoryId === "all" || t.categoryId === filters.categoryId) &&
    !t.transferId;

  const filtered = useMemo(() => txs.filter(matches), [txs, filters]);
  const prevFiltered = useMemo(() => prevTxs.filter(matches), [prevTxs, filters]);

  const total = filtered.reduce((s, t) => s + t.amount, 0);
  const prevTotal = prevFiltered.reduce((s, t) => s + t.amount, 0);
  const pct = percentChange(total, prevTotal);

  const bars = useMemo(() => bucketTx(filtered, filters.range), [filtered, filters.range]);
  const grouped = useMemo(() => groupByDay(filtered), [filtered]);
  const avg = bars.length ? total / bars.length : 0;

  const totalStr = hide ? maskMoney(formatMoney(total, currency)) : formatMoney(total, currency);
  const label = filters.txType === "income" ? "Income" : "Expenses";

  return (
    <div className="safe-top space-y-4 px-4 pt-4">
      {/* header: leads with the period figure + comparison, like Quanto */}
      <header className="text-center">
        <p className="text-sm text-faint">{label} this {periodWord(filters.range)}</p>
        <p className="text-4xl font-bold tracking-tight text-content">{totalStr}</p>
        <div className="mt-1">
          <ComparisonPill pct={pct} label={prevPeriodLabel(filters.range, now, monthStart)} />
        </div>
      </header>

      {/* bar chart */}
      <div className="card p-4">
        {bars.every((b) => b.value === 0) ? (
          <p className="py-12 text-center text-sm text-faint">No data for this period</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={bars} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                interval="preserveStartEnd"
                stroke={chart.label}
              />
              <YAxis
                orientation="right"
                tickLine={false}
                axisLine={false}
                width={38}
                fontSize={11}
                stroke={chart.label}
                tickFormatter={(v) => compact(v)}
              />
              {avg > 0 && (
                <ReferenceLine
                  y={avg}
                  stroke={chart.grid}
                  strokeDasharray="4 4"
                  ifOverflow="extendDomain"
                />
              )}
              <Tooltip
                cursor={{ fill: chart.cursor }}
                formatter={(v: number) => formatMoney(v, currency)}
                labelStyle={{ color: chart.label }}
                contentStyle={{
                  borderRadius: 12,
                  border: `1px solid ${chart.tipBorder}`,
                  background: chart.tip,
                }}
              />
              <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={18} isAnimationActive={false}>
                {bars.map((_, i) => (
                  <Cell key={i} fill={chart.bar} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* filter chips */}
      <FilterChips
        filters={filters}
        onChange={setFilters}
        accounts={accounts}
        categories={categories}
      />

      {/* daily transaction lists */}
      <section className="space-y-4">
        {grouped.map(([day, items]) => {
          const dayTotal = items.reduce((s, t) => s + (t.type === "expense" ? t.amount : -t.amount), 0);
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
                  <TransactionRow
                    key={tx.id}
                    tx={tx}
                    category={categories.find((c) => c.id === tx.categoryId)}
                    hideBalances={hide}
                  />
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

function periodWord(range: RangeKey): string {
  return range === "week" ? "week" : range === "quarter" ? "quarter" : range === "year" ? "year" : "month";
}

/** Compact axis labels: 30000 -> 30k, 1200000 -> 1.2M */
function compact(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(v);
}

function bucketTx(txs: Transaction[], range: RangeKey) {
  const buckets = new Map<string, { label: string; value: number; order: number }>();
  for (const t of txs) {
    const d = dayjs(t.date);
    let key: string;
    let label: string;
    let order: number;
    if (range === "week" || range === "month") {
      key = d.format("YYYY-MM-DD");
      label = d.format("D");
      order = d.valueOf();
    } else {
      key = d.format("YYYY-MM");
      label = d.format("MMM");
      order = d.startOf("month").valueOf();
    }
    const cur = buckets.get(key);
    if (cur) cur.value += t.amount;
    else buckets.set(key, { label, value: t.amount, order });
  }
  return [...buckets.values()].sort((a, b) => a.order - b.order);
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
