import { useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { TransactionForm } from "@/components/TransactionForm";

export default function EditTransaction() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tx = useLiveQuery(() => (id ? db.transactions.get(id) : undefined), [id]);

  if (tx === undefined) {
    return <div className="flex h-full items-center justify-center text-faint">Loading…</div>;
  }
  if (tx === null || !tx) {
    return (
      <div className="safe-top flex h-full flex-col items-center justify-center gap-3 text-faint">
        <p>Transaction not found.</p>
        <button onClick={() => navigate(-1)} className="btn-primary px-5">
          Go back
        </button>
      </div>
    );
  }

  return (
    <TransactionForm
      initial={tx}
      title="Edit transaction"
      onDone={() => navigate(-1)}
      onCancel={() => navigate(-1)}
    />
  );
}
