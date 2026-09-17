import { useState } from "react";
import { formatMoney } from "@/lib/money";

interface Bar {
  label: string; // day-of-month
  value: number;
}

/**
 * Quanto-style daily chart: each day is a thin rounded-cap bar drawn over a
 * faint full-height "track", with a dashed average line and right-side Y-axis
 * labels (max / avg / 0). Pure flexbox — no chart lib — for exact control of
 * the thin isolated bars. Floats directly on the page background (no card).
 */
export function ActivityChart({
  bars,
  currency,
  height = 200,
}: {
  bars: Bar[];
  currency: string;
  height?: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...bars.map((b) => b.value));
  const nonZero = bars.filter((b) => b.value > 0);
  const avg = nonZero.length ? nonZero.reduce((s, b) => s + b.value, 0) / nonZero.length : 0;
  const avgPct = max ? (avg / max) * 100 : 0;

  // x-axis label positions (1, ~9, ~16, ~24, last)
  const n = bars.length;
  const ticks = [0, Math.round(n * 0.27), Math.round(n * 0.5), Math.round(n * 0.76), n - 1];

  return (
    <div className="select-none">
      <div className="relative flex" style={{ height }}>
        {/* plot area: a shorter inner box (88% height, floor lifted off the
            x-axis baseline) so bars, the avg line, and the "0" label all
            share the same floor — matching Figma's ~12% bottom margin. */}
        <div className="relative flex-1">
          <div className="absolute inset-x-0 bottom-[12%] top-0">
            {/* dashed average line */}
            {avg > 0 && (
              <div
                className="pointer-events-none absolute inset-x-0 border-t border-dashed border-content/20 dark:border-white/25"
                style={{ bottom: `${avgPct}%` }}
              />
            )}
            {/* bars + faint tracks */}
            <div className="absolute inset-0 flex items-end gap-[2px]">
              {bars.map((b, i) => {
                const h = max ? (b.value / max) * 100 : 0;
                const isActive = active === i;
                return (
                  <button
                    key={i}
                    onClick={() => setActive(isActive ? null : i)}
                    className="relative flex h-full flex-1 items-end justify-center"
                  >
                    {/* faint full-height track */}
                    <span className="absolute inset-y-0 w-[3px] rounded-full bg-content/[0.08] dark:bg-white/[0.06]" />
                    {/* value bar */}
                    {b.value > 0 && (
                      <span
                        className="relative w-[3px] rounded-full bg-content dark:bg-white transition-[height]"
                        style={{ height: `${Math.max(2, h)}%`, opacity: active !== null && !isActive ? 0.4 : 1 }}
                      />
                    )}
                    {/* tooltip on tap */}
                    {isActive && (
                      <span className="absolute -top-8 whitespace-nowrap rounded-lg bg-surface px-2 py-1 text-[11px] font-medium text-content shadow-card">
                        {formatMoney(b.value, currency)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* right-side y-axis labels, aligned to the same floor as the bars */}
        <div className="relative ml-2 w-12 text-right text-[11px] text-faint">
          <div className="absolute inset-x-0 bottom-[12%] top-0">
            <span className="absolute right-0 top-0">{compact(max, currency)}</span>
            {avg > 0 && avgPct < 86 && (
              <span className="absolute right-0 -translate-y-1/2" style={{ bottom: `${avgPct}%` }}>
                {compact(avg, currency)}
              </span>
            )}
            <span className="absolute bottom-0 right-0">0</span>
          </div>
        </div>
      </div>

      {/* x-axis */}
      <div className="mr-14 mt-1.5 flex justify-between text-[11px] text-faint">
        {ticks.map((t, i) => (
          <span key={i}>{bars[t]?.label}</span>
        ))}
      </div>
    </div>
  );
}

function compact(v: number, currency: string): string {
  const money = (n: number) => formatMoney(n, currency).replace(/[\d.,\s]/g, "");
  const sym = money(0) || "";
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(2)}k`;
  return `${sym}${Math.round(v)}`;
}
