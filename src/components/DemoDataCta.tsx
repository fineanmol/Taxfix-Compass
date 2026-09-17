import { useState } from "react";
import { Sparkles } from "lucide-react";
import { loadSampleData } from "@/lib/sampleData";
import { useSettings } from "@/store/useSettings";

/** Production-safe: loads fictional tagged transactions. Clear from Settings. */
export function DemoDataCta() {
  const load = useSettings((s) => s.load);
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <p className="text-center text-sm text-faint">No transactions yet. Add one, or try demo data.</p>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await loadSampleData();
            await load();
          } finally {
            setBusy(false);
          }
        }}
        className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-card disabled:opacity-50"
      >
        <Sparkles size={16} />
        {busy ? "Loading…" : "Load demo data"}
      </button>
    </div>
  );
}
