import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import dayjs from "dayjs";
import { TransactionRow } from "@/components/TransactionRow";
import { useAllTransactions, useCategories, useGroups } from "@/hooks/useData";
import { useSettings } from "@/store/useSettings";
import { formatMoney, maskMoney } from "@/lib/money";
import { fmtDayHeader } from "@/lib/dates";
import { merchantKey } from "@/db/mutations";
import { isDark } from "@/lib/theme";
import type { Transaction } from "@/db/types";

/**
 * Detail / trend view for a category, merchant, or custom group.
 * Query: ?category=<id> | ?merchant=<key> | ?group=<id>
 */
export default function Detail() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const all = useAllTransactions();
  const categories = useCategories();
  const groups = useGroups();
  const settings = useSettings((s) => s.settings);

  const categoryId = params.get("category");
  const merchant = params.get("merchant");
  const groupId = params.get("group");

  const hide = settings?.hideBalances ?? false;
  const currency = settings?.currency ?? "EUR";
  const dark = isDark(settings?.theme ?? "system");

  const { title, subtitle, txs } = useMemo(() => {
    if (categoryId) {
      const cat = categories.find((c) => c.id === categoryId);
      return {
        title: cat ? `${cat.icon} ${cat.name}` : "Category",
        subtitle: "Category",
        txs: all.filter((t) => t.categoryId === categoryId && !t.transferId),
      };
    }
    if (merchant) {
      const key = merchant.toLowerCase();
      return {
        title: merchant,
        subtitle: "Merchant",
        txs: all.filter((t) => merchantKey(t.note) === key && !t.transferId),
      };
    }
    if (groupId) {
      const g = groups.find((x) => x.id === groupId);
      if (!g) return { title: "Group", subtitle: "Group", txs: [] as Transaction[] };
      const cats = new Set(g.categoryIds);
      const merchants = g.merchants.map((m) => m.toLowerCase());
      return {
        title: `${g.icon} ${g.name}`,
        subtitle: "Group",
        txs: all.filter(
          (t) =>
            !t.transferId &&
            (cats.has(t.categoryId) || merchants.includes(merchantKey(t.note)))
        ),
      };
    }
    return { title: "Detail", subtitle: "", txs: [] as Transaction[] };
  }, [all, categories, groups, categoryId, merchant, groupId]);

  const expenseTxs = txs.filter((t) => t.type === "expense");
  const total = expenseTxs.reduce((s, t) => s + t.amount, 0);
  const totalStr = hide ? maskMoney(formatMoney(total, currency)) : formatMoney(total, currency);

  // monthly trend (last 12 months)
  const bars = useMemo(() => monthlyBuckets(expenseTxs), [expenseTxs]);
  const avg = bars.length ? bars.reduce((s, b) => s + b.value, 0) / bars.length : 0;
  const chart = dark
    ? { bar: "#f5f5f7", label: "#98989d", tip: "#1c1c1e", tipBorder: "#38383a" }
    : { bar: "#1d1d1f", label: "#98989d", tip: "#ffffff", tipBorder: "#e2e2e7" };

  const grouped = useMemo(() => groupByDay(txs), [txs]);

  return (
    <div className="safe-top space-y-4 px-4 pt-4">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-surface shadow-card">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-content">{title}</h1>
          <p className="text-xs text-faint">{subtitle}</p>
        </div>
      </div>

      {/* total + count */}
      <div className="card p-4 text-center">
        <p className="text-xs text-faint">Total spent · {expenseTxs.length} transactions</p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-content">{totalStr}</p>
        {bars.length > 0 && (
          <p className="mt-0.5 text-xs text-faint">
            avg {hide ? maskMoney(formatMoney(avg, currency)) : formatMoney(avg, currency)}/mo
          </p>
        )}
      </div>

      {/* monthly trend */}
      {bars.some((b) => b.value > 0) && (
        <div className="card p-4">
          <p className="mb-2 text-sm font-semibold text-muted">Monthly trend</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={bars} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke={chart.label} interval="preserveStartEnd" />
              <YAxis orientation="right" width={40} tickLine={false} axisLine={false} fontSize={11} stroke={chart.label} tickFormatter={compact} />
              <Tooltip
                formatter={(v: number) => formatMoney(v, currency)}
                contentStyle={{ borderRadius: 12, border: `1px solid ${chart.tipBorder}`, background: chart.tip }}
                labelStyle={{ color: chart.label }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={26} isAnimationActive={false}>
                {bars.map((_, i) => (
                  <Cell key={i} fill={chart.bar} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* transactions */}
      <section className="space-y-4 pb-4">
        {grouped.map(([day, items]) => (
          <div key={day}>
            <h3 className="mb-1 px-1 text-sm font-semibold text-muted">{fmtDayHeader(Number(day))}</h3>
            <div className="card divide-y divide-line p-1">
              {items.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  category={categories.find((c) => c.id === tx.categoryId)}
                  hideBalances={hide}
                  onClick={() => navigate(`/edit/${tx.id}`)}
                />
              ))}
            </div>
          </div>
        ))}
        {grouped.length === 0 && (
          <p className="py-6 text-center text-sm text-faint">No transactions.</p>
        )}
      </section>
    </div>
  );
}

function compact(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(v);
}

function monthlyBuckets(txs: Transaction[]) {
  const map = new Map<string, { label: string; value: number; order: number }>();
  // seed the last 12 months so gaps show as zero
  const start = dayjs().subtract(11, "month").startOf("month");
  for (let i = 0; i < 12; i++) {
    const d = start.add(i, "month");
    map.set(d.format("YYYY-MM"), { label: d.format("MMM"), value: 0, order: d.valueOf() });
  }
  for (const t of txs) {
    const key = dayjs(t.date).format("YYYY-MM");
    const b = map.get(key);
    if (b) b.value += t.amount;
  }
  return [...map.values()].sort((a, b) => a.order - b.order);
}

function groupByDay(txs: Transaction[]): [string, Transaction[]][] {
  const map = new Map<string, Transaction[]>();
  for (const t of txs) {
    const key = String(dayjs(t.date).startOf("day").valueOf());
    (map.get(key) ?? map.set(key, []).get(key)!).push(t);
  }
  const entries: [string, Transaction[]][] = [...map.entries()].map(([k, v]) => [
    k,
    v.sort((x, y) => y.date - x.date),
  ]);
  return entries.sort((a, b) => Number(b[0]) - Number(a[0])).slice(0, 60);
}
