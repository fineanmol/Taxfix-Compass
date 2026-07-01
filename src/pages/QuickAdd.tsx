import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { TransactionForm } from "@/components/TransactionForm";

/**
 * Fast-entry route intended to be opened directly (e.g. from an iOS Shortcut
 * bound to Back Tap). It's the closest a PWA can get to Quanto's Dynamic Island
 * quick-add: a single focused screen that saves and confirms, then can be
 * dismissed. (True Dynamic Island rendering requires a native app.)
 */
export default function QuickAdd() {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);

  if (saved) {
    return (
      <div className="safe-top flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-mint text-white">
          <Check size={44} strokeWidth={3} />
        </span>
        <p className="text-xl font-bold text-content">Saved!</p>
        <div className="flex gap-2">
          <button onClick={() => setSaved(false)} className="btn-primary px-5">
            Add another
          </button>
          <button
            onClick={() => navigate("/")}
            className="rounded-xl border border-line px-5 py-3 font-semibold text-muted"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <TransactionForm
      title="Quick add"
      onDone={() => setSaved(true)}
      onCancel={() => navigate("/")}
    />
  );
}
