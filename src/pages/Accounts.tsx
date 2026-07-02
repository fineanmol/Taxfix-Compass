import { useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  ArrowLeftRight,
  X,
  Banknote,
  Landmark,
  PiggyBank,
  CreditCard,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useAccounts, useTransactionsInRange, useCategories } from "@/hooks/useData";
import { useSettings } from "@/store/useSettings";
import { accountBalance } from "@/lib/calc";
import { formatMoney, maskMoney, CURRENCIES } from "@/lib/money";
import { PageHeader, IconButton } from "@/components/ui";
import {
  addAccount,
  updateAccount,
  deleteAccount,
  addTransfer,
  addCategory,
} from "@/db/mutations";
import type { Account, AccountType } from "@/db/types";
import dayjs from "dayjs";

const ACCOUNT_TYPES: AccountType[] = ["cash", "checking", "savings", "credit", "other"];

const TYPE_META: Record<AccountType, { icon: LucideIcon; color: string }> = {
  cash: { icon: Banknote, color: "#34C759" },
  checking: { icon: Landmark, color: "#0066CC" },
  savings: { icon: PiggyBank, color: "#FF9500" },
  credit: { icon: CreditCard, color: "#AF52DE" },
  other: { icon: Wallet, color: "#8E8E93" },
};

export default function Accounts() {
  const accounts = useAccounts();
  const categories = useCategories();
  const settings = useSettings((s) => s.settings);
  const now = useMemo(() => Date.now(), []);
  const allTx = useTransactionsInRange(0, now);

  const hide = settings?.hideBalances ?? false;
  const defaultCurrency = settings?.currency ?? "USD";

  const [showAdd, setShowAdd] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  const fmt = (n: number, c: string) =>
    hide ? maskMoney(formatMoney(n, c)) : formatMoney(n, c);

  // total across accounts sharing the default currency (mixed currencies aren't summed)
  const total = accounts
    .filter((a) => a.currency === defaultCurrency)
    .reduce((s, a) => s + accountBalance(a, allTx), 0);

  return (
    <div className="safe-top space-y-4 px-4 pt-4">
      <PageHeader
        title="Accounts"
        action={
          <div className="flex gap-2">
            {accounts.length > 1 && (
              <IconButton icon={ArrowLeftRight} label="Transfer" onClick={() => setShowTransfer(true)} />
            )}
            <IconButton icon={Plus} label="Add account" variant="primary" onClick={() => setShowAdd(true)} />
          </div>
        }
      />

      {/* total-balance summary card */}
      <div className="overflow-hidden rounded-2xl bg-brand-gradient p-5 text-white shadow-card">
        <p className="text-sm text-white/70">Total balance</p>
        <p className="mt-1 text-3xl font-bold tracking-tight">{fmt(total, defaultCurrency)}</p>
        <p className="mt-1 text-xs text-white/60">
          {accounts.length} account{accounts.length === 1 ? "" : "s"} · {defaultCurrency}
        </p>
      </div>

      <div className="space-y-2.5">
        {accounts.map((a) => {
          const meta = TYPE_META[a.type];
          const Icon = meta.icon;
          return (
            <div key={a.id} className="card flex items-center gap-3 p-3.5">
              <button onClick={() => setEditing(a)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: meta.color + "22", color: meta.color }}
                >
                  <Icon size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-content">{a.name}</p>
                  <p className="text-xs capitalize text-faint">
                    {a.type} · {a.currency}
                  </p>
                </div>
                <span className="shrink-0 text-lg font-bold text-content">
                  {fmt(accountBalance(a, allTx), a.currency)}
                </span>
              </button>
              {accounts.length > 1 && (
                <button
                  onClick={() => {
                    if (confirm(`Delete "${a.name}"? Its transactions stay but become orphaned.`))
                      deleteAccount(a.id);
                  }}
                  className="shrink-0 p-1 text-faint hover:text-red-500"
                  aria-label="Delete account"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {showAdd && (
        <AccountSheet defaultCurrency={defaultCurrency} onClose={() => setShowAdd(false)} />
      )}
      {editing && (
        <AccountSheet
          account={editing}
          defaultCurrency={defaultCurrency}
          onClose={() => setEditing(null)}
        />
      )}
      {showTransfer && (
        <TransferSheet
          onClose={() => setShowTransfer(false)}
          accounts={accounts}
          categories={categories}
          defaultCurrency={defaultCurrency}
        />
      )}
    </div>
  );
}

function Sheet({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30" onClick={onClose}>
      <div
        className="safe-bottom w-full max-w-md rounded-t-3xl bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-content">{title}</h2>
          <button onClick={onClose} className="text-faint"><X size={22} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AccountSheet({
  account,
  defaultCurrency,
  onClose,
}: {
  account?: Account;
  defaultCurrency: string;
  onClose: () => void;
}) {
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<AccountType>(account?.type ?? "checking");
  const [currency, setCurrency] = useState(account?.currency ?? defaultCurrency);
  const [opening, setOpening] = useState(String(account?.openingBalance ?? 0));
  const isEdit = !!account;

  return (
    <Sheet title={isEdit ? "Edit account" : "New account"} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Checking"
            className="input"
          />
        </Field>
        <Field label="Type">
          <select value={type} onChange={(e) => setType(e.target.value as AccountType)} className="input capitalize">
            {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Currency">
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="input">
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
            </select>
          </Field>
          <Field label="Opening balance">
            <input
              type="number"
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
              className="input"
            />
          </Field>
        </div>
        <button
          disabled={!name.trim()}
          onClick={async () => {
            if (account) {
              await updateAccount(account.id, {
                name: name.trim(),
                type,
                currency,
                openingBalance: Number(opening) || 0,
              });
            } else {
              await addAccount({
                name: name.trim(),
                type,
                currency,
                openingBalance: Number(opening) || 0,
              });
            }
            onClose();
          }}
          className="btn-primary w-full disabled:opacity-40"
        >
          {isEdit ? "Save changes" : "Add account"}
        </button>
      </div>
    </Sheet>
  );
}

function TransferSheet({
  onClose,
  accounts,
  categories,
  defaultCurrency,
}: {
  onClose: () => void;
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string; type: string }[];
  defaultCurrency: string;
}) {
  const [from, setFrom] = useState(accounts[0]?.id ?? "");
  const [to, setTo] = useState(accounts[1]?.id ?? "");
  const [amount, setAmount] = useState("");

  async function ensureTransferCategory(): Promise<string> {
    const existing = categories.find((c) => c.name === "Transfer");
    if (existing) return existing.id;
    return addCategory({ name: "Transfer", icon: "🔄", color: "#0066cc", type: "expense" });
  }

  return (
    <Sheet title="Transfer" onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="From">
            <select value={from} onChange={(e) => setFrom(e.target.value)} className="input">
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          <Field label="To">
            <select value={to} onChange={(e) => setTo(e.target.value)} className="input">
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Amount">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="input"
          />
        </Field>
        <button
          disabled={!amount || from === to || Number(amount) <= 0}
          onClick={async () => {
            const transferCategoryId = await ensureTransferCategory();
            await addTransfer({
              amount: Number(amount),
              fromAccountId: from,
              toAccountId: to,
              date: dayjs().valueOf(),
              currency: defaultCurrency,
              note: "Transfer",
              transferCategoryId,
            });
            onClose();
          }}
          className="btn-primary w-full disabled:opacity-40"
        >
          Transfer
        </button>
        {from === to && <p className="text-center text-xs text-red-500">Pick two different accounts</p>}
      </div>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
