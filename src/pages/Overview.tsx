import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { PageHeader } from "@/components/ui";
import { MonthPicker } from "@/components/MonthPicker";
import { useTransactionsInRange } from "@/hooks/useData";
import { useSettings } from "@/store/useSettings";
import { formatMoney, maskMoney, currencySymbol } from "@/lib/money";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export default function Overview() {
  const navigate = useNavigate();
  const settings = useSettings((s) => s.settings);
  const [month, setMonth] = useState(() => dayjs().startOf("month").valueOf());

  const start = dayjs(month).startOf("month");
  const end = dayjs(month).endOf("month");
  const txs = useTransactionsInRange(start.valueOf(), end.valueOf());

  const hide = settings?.hideBalances ?? false;
  const currency = settings?.currency ?? "EUR";

  // spend per day-of-month
  const perDay = useMemo(() => {
    const m = new Map<number, number>();
    for (const t of txs) {
      if (t.type !== "expense" || t.transferId) continue;
      const d = dayjs(t.date).date();
      m.set(d, (m.get(d) ?? 0) + t.amount);
    }
    return m;
  }, [txs]);

  const maxDay = Math.max(1, ...[...perDay.values()]);
  const total = [...perDay.values()].reduce((s, v) => s + v, 0);

  // build calendar grid (Mon-first)
  const daysInMonth = start.daysInMonth();
  const firstWeekday = (start.day() + 6) % 7; // 0=Mon
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const today = dayjs();
  const isThisMonth = start.isSame(today, "month");

  return (
    <div className="safe-top space-y-4 px-4 pt-4">
      <PageHeader title="Overview" subtitle="Spending calendar" />

      <MonthPicker month={month} onChange={setMonth} />

      <div className="card p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-sm text-faint">Spent in {start.format("MMMM")}</span>
          <span className="text-lg font-bold text-content">
            {hide ? maskMoney(formatMoney(total, currency)) : formatMoney(total, currency)}
          </span>
        </div>

        {/* weekday header */}
        <div className="mb-1 grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((w, i) => (
            <div key={i} className="text-center text-[11px] font-medium text-faint">
              {w}
            </div>
          ))}
        </div>

        {/* day cells */}
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />;
            const amt = perDay.get(day) ?? 0;
            const intensity = amt > 0 ? 0.38 + 0.62 * (amt / maxDay) : 0;
            const isToday = isThisMonth && day === today.date();
            return (
              <div
                key={i}
                className={`flex aspect-square flex-col items-center justify-center rounded-xl ${
                  isToday ? "ring-2 ring-brand-400" : ""
                }`}
                style={{
                  backgroundColor: amt > 0 ? `rgba(54,137,59,${intensity})` : "rgb(var(--surface-2))",
                }}
              >
                <span className={`text-[13px] font-semibold ${amt > 0 ? "text-white" : "text-muted"}`}>
                  {day}
                </span>
                {amt > 0 && (
                  <span className="text-[9px] leading-none text-white/90">
                    {hide ? "•" : compact(amt, currency)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button onClick={() => navigate("/summary")} className="card flex w-full items-center justify-between p-4 active:bg-surface-2">
        <span className="font-medium text-content">See category breakdown</span>
        <span className="text-sm text-brand-500">Summary →</span>
      </button>
    </div>
  );
}

function compact(v: number, currency: string): string {
  const sym = currencySymbol(currency);
  if (v >= 1000) return `${sym}${(v / 1000).toFixed(1)}k`;
  return `${sym}${Math.round(v)}`;
}
