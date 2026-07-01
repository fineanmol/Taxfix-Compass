import { Delete } from "lucide-react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"];

/**
 * Calculator-style keypad that edits a decimal string.
 * Caller owns the value; we just emit the next string.
 */
export function NumericKeypad({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  function press(k: string) {
    if (k === "del") {
      onChange(value.length <= 1 ? "0" : value.slice(0, -1));
      return;
    }
    if (k === ".") {
      if (value.includes(".")) return;
      onChange(value + ".");
      return;
    }
    // digit
    if (value === "0") {
      onChange(k);
      return;
    }
    // limit to 2 decimal places
    const dot = value.indexOf(".");
    if (dot !== -1 && value.length - dot > 2) return;
    onChange(value + k);
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {KEYS.map((k) => (
        <button
          key={k}
          onClick={() => press(k)}
          className="flex h-14 items-center justify-center rounded-xl bg-surface text-2xl font-semibold text-content shadow-card active:bg-surface-2 active:scale-95 transition"
        >
          {k === "del" ? <Delete size={24} /> : k}
        </button>
      ))}
    </div>
  );
}
