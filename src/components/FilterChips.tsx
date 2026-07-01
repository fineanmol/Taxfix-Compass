import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import type { RangeKey } from "@/lib/dates";

export interface Filters {
  txType: "expense" | "income" | "all";
  range: RangeKey;
  accountId: string | "all";
  categoryId: string | "all";
}

interface Opt {
  value: string;
  label: string;
}

/** Quanto-style horizontal chip row; each chip opens a small option popover. */
export function FilterChips({
  filters,
  onChange,
  accounts,
  categories,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}) {
  const rangeOpts: Opt[] = [
    { value: "week", label: "Weekly" },
    { value: "month", label: "Monthly" },
    { value: "quarter", label: "Quarterly" },
    { value: "year", label: "Yearly" },
  ];
  const typeOpts: Opt[] = [
    { value: "expense", label: "Expenses" },
    { value: "income", label: "Income" },
    { value: "all", label: "All" },
  ];
  const accOpts: Opt[] = [
    { value: "all", label: "All accounts" },
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
  ];
  const catOpts: Opt[] = [
    { value: "all", label: "All categories" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
      <Chip
        label={typeOpts.find((o) => o.value === filters.txType)!.label}
        options={typeOpts}
        value={filters.txType}
        onSelect={(v) => onChange({ ...filters, txType: v as Filters["txType"] })}
      />
      <Chip
        label={rangeOpts.find((o) => o.value === filters.range)!.label}
        options={rangeOpts}
        value={filters.range}
        onSelect={(v) => onChange({ ...filters, range: v as RangeKey })}
      />
      <Chip
        label={accOpts.find((o) => o.value === filters.accountId)?.label ?? "All accounts"}
        options={accOpts}
        value={filters.accountId}
        onSelect={(v) => onChange({ ...filters, accountId: v })}
      />
      <Chip
        label={catOpts.find((o) => o.value === filters.categoryId)?.label ?? "All categories"}
        options={catOpts}
        value={filters.categoryId}
        onSelect={(v) => onChange({ ...filters, categoryId: v })}
      />
    </div>
  );
}

function Chip({
  label,
  options,
  value,
  onSelect,
}: {
  label: string;
  options: Opt[];
  value: string;
  onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-full bg-surface-2 px-3.5 py-1.5 text-sm font-medium text-content"
      >
        {label}
        <ChevronDown size={14} className="text-faint" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 max-h-64 min-w-40 overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-card">
            {options.map((o) => (
              <button
                key={o.value}
                onClick={() => {
                  onSelect(o.value);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-content hover:bg-surface-2"
              >
                {o.label}
                {o.value === value && <Check size={15} className="text-brand-600" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
