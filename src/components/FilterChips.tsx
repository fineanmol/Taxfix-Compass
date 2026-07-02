import { useState } from "react";
import { Search, X, Check } from "lucide-react";
import type { RangeKey } from "@/lib/dates";

export type SortKey = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

export interface Filters {
  txType: "expense" | "income" | "all";
  range: RangeKey; // kept for compatibility; Activity uses month nav
  accountId: string | "all";
  categoryId: string | "all";
  sort: SortKey;
}

interface Opt {
  value: string;
  label: string;
}

/**
 * Filter row: a circular search button that expands into a search field,
 * followed by pill chips (type / account / category / sort). Each chip opens a
 * BOTTOM SHEET — not an inline popover — because inline popovers inside a
 * horizontally-scrolling row are unreliable to tap on touch devices (the scroll
 * container swallows the tap and can clip the menu). Bottom sheets always work.
 */
export function ActivityFilters({
  filters,
  onChange,
  accounts,
  categories,
  search,
  onSearch,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string; type: string }[];
  search: string;
  onSearch: (q: string) => void;
}) {
  const [searching, setSearching] = useState(false);
  // which chip's sheet is open
  const [sheet, setSheet] = useState<null | "type" | "account" | "category" | "sort">(null);

  const typeOpts: Opt[] = [
    { value: "expense", label: "Expenses" },
    { value: "income", label: "Income" },
    { value: "all", label: "All types" },
  ];
  const accOpts: Opt[] = [
    { value: "all", label: "All accounts" },
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
  ];
  const catOpts: Opt[] = [
    { value: "all", label: "All categories" },
    ...categories
      .filter((c) => filters.txType === "all" || c.type === filters.txType)
      .map((c) => ({ value: c.id, label: c.name })),
  ];
  const sortOpts: Opt[] = [
    { value: "date-desc", label: "Newest first" },
    { value: "date-asc", label: "Oldest first" },
    { value: "amount-desc", label: "Highest amount" },
    { value: "amount-asc", label: "Lowest amount" },
  ];

  if (searching) {
    return (
      <div className="flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2.5">
        <Search size={17} className="shrink-0 text-faint" />
        <input
          autoFocus
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search merchant, note, amount…"
          className="w-full bg-transparent text-[15px] text-content outline-none placeholder:text-faint"
        />
        <button
          onClick={() => {
            onSearch("");
            setSearching(false);
          }}
          className="shrink-0 text-faint"
        >
          <X size={18} />
        </button>
      </div>
    );
  }

  const label = (opts: Opt[], v: string, fallback: string) =>
    opts.find((o) => o.value === v)?.label ?? fallback;

  return (
    <>
      <div className="no-scrollbar -mx-4 flex items-center gap-2.5 overflow-x-auto px-4">
        <button
          onClick={() => setSearching(true)}
          aria-label="Search"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-content"
        >
          <Search size={18} />
        </button>
        <Chip label={label(typeOpts, filters.txType, "Expenses")} onClick={() => setSheet("type")} active={filters.txType !== "expense"} />
        <Chip label={label(accOpts, filters.accountId, "All accounts")} onClick={() => setSheet("account")} active={filters.accountId !== "all"} />
        <Chip label={label(catOpts, filters.categoryId, "All categories")} onClick={() => setSheet("category")} active={filters.categoryId !== "all"} />
        <Chip label={label(sortOpts, filters.sort, "Sort")} onClick={() => setSheet("sort")} active={filters.sort !== "date-desc"} />
      </div>

      {sheet === "type" && (
        <OptionSheet
          title="Show"
          options={typeOpts}
          value={filters.txType}
          onClose={() => setSheet(null)}
          onSelect={(v) => onChange({ ...filters, txType: v as Filters["txType"], categoryId: "all" })}
        />
      )}
      {sheet === "account" && (
        <OptionSheet title="Account" options={accOpts} value={filters.accountId} onClose={() => setSheet(null)} onSelect={(v) => onChange({ ...filters, accountId: v })} />
      )}
      {sheet === "category" && (
        <OptionSheet title="Category" options={catOpts} value={filters.categoryId} onClose={() => setSheet(null)} onSelect={(v) => onChange({ ...filters, categoryId: v })} />
      )}
      {sheet === "sort" && (
        <OptionSheet title="Sort by" options={sortOpts} value={filters.sort} onClose={() => setSheet(null)} onSelect={(v) => onChange({ ...filters, sort: v as SortKey })} />
      )}
    </>
  );
}

function Chip({ label, onClick, active }: { label: string; onClick: () => void; active: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-[15px] font-medium transition ${
        active ? "bg-brand-500 text-white" : "bg-surface-2 text-content"
      }`}
    >
      {label}
    </button>
  );
}

function OptionSheet({
  title,
  options,
  value,
  onSelect,
  onClose,
}: {
  title: string;
  options: Opt[];
  value: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-t-3xl bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* fixed header (stays put while options scroll) */}
        <div className="shrink-0 px-5 pt-3">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
          <h2 className="mb-1 text-center text-lg font-bold text-content">{title}</h2>
        </div>
        {/* scrollable options — min-h-0 lets this flex child actually scroll */}
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="divide-y divide-line">
            {options.map((o) => (
              <button
                key={o.value}
                onClick={() => {
                  onSelect(o.value);
                  onClose();
                }}
                className="flex w-full items-center justify-between gap-3 py-3.5 text-left text-[16px] text-content active:opacity-60"
              >
                {o.label}
                {o.value === value && <Check size={18} className="text-brand-500" />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
