import { useMemo, useState } from "react";
import { X, Check, Trash2 } from "lucide-react";
import dayjs from "dayjs";
import { NumericKeypad } from "@/components/NumericKeypad";
import { CategoryIcon } from "@/components/CategoryIcon";
import { useAccounts, useCategories } from "@/hooks/useData";
import { useSettings } from "@/store/useSettings";
import {
  addTransaction,
  updateTransaction,
  deleteTransaction,
  merchantKey,
  countByMerchant,
  applyCategoryToMerchant,
  saveMerchantRule,
} from "@/db/mutations";
import { currencySymbol } from "@/lib/money";
import type { Transaction, TxType } from "@/db/types";

/**
 * Shared expense/income editor used by the Add screen, the edit sheet and
 * quick-add. Pass `initial` to edit an existing transaction.
 */
export function TransactionForm({
  initial,
  title,
  onDone,
  onCancel,
}: {
  initial?: Transaction;
  title?: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const accounts = useAccounts();
  const categories = useCategories();
  const settings = useSettings((s) => s.settings);

  const [type, setType] = useState<TxType>(initial?.type ?? "expense");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "0");
  const [categoryId, setCategoryId] = useState<string>(initial?.categoryId ?? "");
  const [accountId, setAccountId] = useState<string>(initial?.accountId ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [date, setDate] = useState(dayjs(initial?.date ?? Date.now()).format("YYYY-MM-DD"));
  const [saving, setSaving] = useState(false);

  const currency = initial?.currency ?? settings?.currency ?? "EUR";
  const visibleCategories = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type]
  );

  if (!accountId && accounts.length) setAccountId(accounts[0].id);
  if (!categoryId && visibleCategories.length) setCategoryId(visibleCategories[0].id);

  const numeric = Number(amount);
  const canSave = numeric > 0 && !!categoryId && !!accountId && !saving;
  const isEdit = !!initial;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    const payload = {
      amount: numeric,
      type,
      categoryId,
      accountId,
      date: dayjs(date).valueOf(),
      note: note.trim() || undefined,
      currency,
    };
    if (initial) {
      const categoryChanged = initial.categoryId !== categoryId;
      await updateTransaction(initial.id, payload);
      // when re-categorizing, offer to apply to all same-merchant transactions
      const merchant = merchantKey(payload.note);
      if (categoryChanged && merchant) {
        const others = await countByMerchant(merchant, initial.id);
        if (
          others > 0 &&
          confirm(
            `Also move the other ${others} “${payload.note}” transaction(s) to this category?\n\n` +
              `(This also remembers the rule for future imports.)`
          )
        ) {
          await applyCategoryToMerchant(merchant, categoryId);
          await saveMerchantRule(merchant, categoryId);
        } else if (categoryChanged) {
          // still remember the rule so future imports benefit
          await saveMerchantRule(merchant, categoryId);
        }
      }
    } else {
      await addTransaction(payload);
    }
    onDone();
  }

  async function remove() {
    if (!initial) return;
    if (confirm("Delete this transaction?")) {
      await deleteTransaction(initial.id);
      onDone();
    }
  }

  return (
    <div className="safe-top flex min-h-full flex-col bg-bg">
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={onCancel} aria-label="Close" className="p-2 text-muted">
          <X size={24} />
        </button>
        <div className="flex rounded-full bg-surface p-1 shadow-card">
          {(["expense", "income"] as TxType[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setType(t);
                setCategoryId("");
              }}
              className={`rounded-full px-5 py-1.5 text-sm font-semibold capitalize transition ${
                type === t
                  ? t === "expense"
                    ? "bg-red-500 text-white"
                    : "bg-mint text-white"
                  : "text-muted"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {isEdit ? (
          <button onClick={remove} aria-label="Delete" className="p-2 text-red-500">
            <Trash2 size={22} />
          </button>
        ) : (
          <button onClick={save} disabled={!canSave} aria-label="Save" className="p-2 text-brand-600 disabled:text-faint">
            <Check size={26} />
          </button>
        )}
      </div>

      {title && <p className="text-center text-sm font-medium text-faint">{title}</p>}

      {/* amount display */}
      <div className="flex flex-col items-center justify-center py-5">
        <div className="text-sm text-faint">{accountName(accounts, accountId)}</div>
        <div className={`mt-1 text-5xl font-bold tracking-tight ${type === "expense" ? "text-red-500" : "text-mint"}`}>
          {currencySymbol(currency)}
          {amount}
        </div>
      </div>

      {/* category quick-pick */}
      <div className="no-scrollbar overflow-x-auto px-3 pb-3">
        <div className="flex gap-3">
          {visibleCategories.map((c) => {
            const active = c.id === categoryId;
            return (
              <button
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className="flex w-16 shrink-0 flex-col items-center gap-1"
              >
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-2xl transition"
                  style={{
                    backgroundColor: active ? c.color : c.color + "22",
                    color: active ? "#fff" : c.color,
                    outline: active ? `2px solid ${c.color}` : "none",
                  }}
                >
                  <CategoryIcon name={c.icon} size={22} />
                </span>
                <span className="line-clamp-1 text-[11px] text-muted">{c.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* note + date */}
      <div className="flex gap-2 px-4 pb-3">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note…"
          className="input flex-1"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input w-40"
        />
      </div>

      {/* account selector (if more than one) */}
      {accounts.length > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3">
          {accounts.map((a) => (
            <button
              key={a.id}
              onClick={() => setAccountId(a.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                a.id === accountId ? "bg-brand-500 text-white" : "bg-surface text-muted shadow-card"
              }`}
            >
              {a.name}
            </button>
          ))}
        </div>
      )}

      {/* keypad */}
      <div className="safe-bottom mt-auto bg-bg p-3">
        <NumericKeypad value={amount} onChange={setAmount} />
        <button onClick={save} disabled={!canSave} className="btn-primary mt-3 w-full disabled:opacity-40">
          {isEdit ? "Save changes" : `Save ${type}`}
        </button>
      </div>
    </div>
  );
}

function accountName(accounts: { id: string; name: string }[], id: string): string {
  return accounts.find((a) => a.id === id)?.name ?? "";
}
