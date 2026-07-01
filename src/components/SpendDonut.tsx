import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { Category } from "@/db/types";
import type { CategorySlice } from "@/lib/calc";
import { formatMoney, maskMoney } from "@/lib/money";
import { ComparisonPill } from "./ComparisonPill";

export function SpendDonut({
  slices,
  categories,
  currency,
  hideBalances,
  centerLabel = "Spent",
  pct,
  comparisonLabel,
}: {
  slices: CategorySlice[];
  categories: Category[];
  currency: string;
  hideBalances: boolean;
  centerLabel?: string;
  pct?: number | null;
  comparisonLabel?: string;
}) {
  const total = slices.reduce((s, x) => s + x.total, 0);
  const data = slices.map((s) => {
    const cat = categories.find((c) => c.id === s.categoryId);
    return { name: cat?.name ?? "Other", value: s.total, color: cat?.color ?? "#8E8E93" };
  });

  const money = formatMoney(total, currency);
  const center = hideBalances ? maskMoney(money) : money;

  if (total === 0) {
    return (
      <div className="flex h-56 flex-col items-center justify-center text-faint">
        <span className="text-4xl">💸</span>
        <p className="mt-2 text-sm">No spending in this period</p>
      </div>
    );
  }

  return (
    <div className="relative mx-auto h-60 w-60">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={108}
            outerRadius={120}
            paddingAngle={3}
            cornerRadius={10}
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
        <span className="text-xs font-medium text-faint">{centerLabel}</span>
        <span className="mt-0.5 text-[2.1rem] font-bold leading-none tracking-tight text-content">
          {center}
        </span>
        {comparisonLabel !== undefined && (
          <span className="mt-2">
            <ComparisonPill pct={pct ?? null} label={comparisonLabel} />
          </span>
        )}
      </div>
    </div>
  );
}
