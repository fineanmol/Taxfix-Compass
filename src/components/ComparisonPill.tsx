import { ArrowDown, ArrowUp } from "lucide-react";

/**
 * "↓18% from Jan" style pill. For expenses, DOWN is good (green), UP is bad (red).
 */
export function ComparisonPill({
  pct,
  label,
}: {
  pct: number | null;
  label: string;
}) {
  // nothing meaningful to compare — render nothing rather than "No change from…"
  if (pct === null || pct === 0) return null;
  const up = pct > 0;
  const good = !up; // spending less than last period is good
  const color = good ? "text-mint" : "text-red-500";
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium ${color}`}>
      <Icon size={14} strokeWidth={2.5} />
      {Math.abs(pct)}% from {label}
    </span>
  );
}
