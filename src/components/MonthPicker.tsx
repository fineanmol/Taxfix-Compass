import { useState } from "react";
import { ChevronDown } from "lucide-react";
import dayjs from "dayjs";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Quanto-style month/year picker. The trigger shows "July 2026 ⌄"; tapping it
 * opens a bottom sheet with a year-chip row and a month grid. Future months are
 * disabled. `month` is the epoch-ms of the selected month's start.
 */
export function MonthPicker({
  month,
  onChange,
  label,
}: {
  month: number;
  onChange: (ms: number) => void;
  label?: (m: number) => string;
}) {
  const [open, setOpen] = useState(false);
  const sel = dayjs(month);
  const [pendingYear, setPendingYear] = useState(sel.year());
  const now = dayjs();

  const thisYear = now.year();
  const years = Array.from({ length: 6 }, (_, i) => thisYear - i);

  const trigger = label ? label(month) : sel.format("MMMM YYYY");

  function pick(monthIdx: number) {
    onChange(dayjs().year(pendingYear).month(monthIdx).startOf("month").valueOf());
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => {
          setPendingYear(sel.year());
          setOpen(true);
        }}
        className="mx-auto flex items-center gap-1 rounded-full bg-surface-2 px-4 py-1.5 text-sm font-semibold text-content"
      >
        {trigger}
        <ChevronDown size={16} className="text-faint" />
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="safe-bottom w-full max-w-md rounded-t-3xl bg-surface p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
            <h2 className="mb-4 text-center text-lg font-bold text-content">Select date</h2>

            {/* year chips */}
            <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
              {years.map((y) => (
                <button
                  key={y}
                  onClick={() => setPendingYear(y)}
                  className={`shrink-0 rounded-full px-5 py-2 text-sm font-medium transition ${
                    pendingYear === y
                      ? "border-2 border-content text-content"
                      : "bg-surface-2 text-muted"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>

            {/* month grid */}
            <div className="grid grid-cols-3 gap-2.5">
              {MONTHS.map((m, i) => {
                const future = pendingYear > thisYear || (pendingYear === thisYear && i > now.month());
                const active = pendingYear === sel.year() && i === sel.month();
                return (
                  <button
                    key={m}
                    disabled={future}
                    onClick={() => pick(i)}
                    className={`rounded-2xl py-3.5 text-sm font-medium transition ${
                      active
                        ? "border-2 border-content text-content"
                        : future
                          ? "bg-surface-2 text-faint opacity-40"
                          : "bg-surface-2 text-content"
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-center text-xs text-faint">
              Tip: pick any month to jump to it.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
