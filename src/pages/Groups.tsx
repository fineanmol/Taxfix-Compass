import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, X, Layers } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { IconButton, EmptyState } from "@/components/ui";
import { useAllTransactions, useCategories, useGroups } from "@/hooks/useData";
import { useSettings } from "@/store/useSettings";
import { addGroup, updateGroup, deleteGroup, merchantKey } from "@/db/mutations";
import { formatMoney, maskMoney } from "@/lib/money";
import { rangeBounds } from "@/lib/dates";
import type { Group } from "@/db/types";

export default function Groups() {
  const navigate = useNavigate();
  const groups = useGroups();
  const categories = useCategories();
  const all = useAllTransactions();
  const settings = useSettings((s) => s.settings);
  const [editing, setEditing] = useState<Group | null>(null);
  const [creating, setCreating] = useState(false);

  const hide = settings?.hideBalances ?? false;
  const currency = settings?.currency ?? "EUR";

  // spend in the last 30 days per group
  const now = useMemo(() => Date.now(), []);
  const { start, end } = rangeBounds("month", now);
  function groupTotal(g: Group): number {
    const cats = new Set(g.categoryIds);
    const merchants = g.merchants.map((m) => m.toLowerCase());
    return all
      .filter(
        (t) =>
          t.type === "expense" &&
          !t.transferId &&
          t.date >= start &&
          t.date <= end &&
          (cats.has(t.categoryId) || merchants.includes(merchantKey(t.note)))
      )
      .reduce((s, t) => s + t.amount, 0);
  }

  const fmt = (n: number) => (hide ? maskMoney(formatMoney(n, currency)) : formatMoney(n, currency));

  return (
    <div className="safe-top space-y-4 px-4 pt-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-content">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface shadow-card">
            <ArrowLeft size={18} />
          </span>
          <span className="text-2xl font-bold tracking-tight">Groups</span>
        </button>
        <IconButton icon={Plus} label="New group" variant="primary" onClick={() => setCreating(true)} />
      </div>

      <p className="text-sm text-faint">
        Club categories or merchants together — e.g. all credit cards — and track them over time.
      </p>

      {groups.length === 0 && (
        <EmptyState
          icon={Layers}
          title="No groups yet"
          hint="Create a group like ‘Credit cards’ (Advanzia + others) to see combined spending trends."
          action={<button onClick={() => setCreating(true)} className="btn-primary px-5">New group</button>}
        />
      )}

      <div className="space-y-2.5">
        {groups.map((g) => (
          <div key={g.id} className="card flex items-center gap-3 p-3.5">
            <button onClick={() => navigate(`/detail?group=${g.id}`)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: g.color + "22" }}
              >
                <CategoryIcon name={g.icon} size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-content">{g.name}</p>
                <p className="text-xs text-faint">
                  {g.categoryIds.length} categories · {g.merchants.length} merchants
                </p>
              </div>
              <span className="shrink-0 text-right">
                <span className="block font-bold text-content">{fmt(groupTotal(g))}</span>
                <span className="block text-[11px] text-faint">last 30d</span>
              </span>
            </button>
            <button onClick={() => setEditing(g)} className="shrink-0 text-xs text-brand-600">Edit</button>
          </div>
        ))}
      </div>

      {(editing || creating) && (
        <GroupSheet
          group={editing}
          categories={categories}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

const GROUP_COLORS = ["#36893B", "#668CFF", "#F8A21A", "#BC73F2", "#154618", "#9A9288", "#F8C677", "#B6C5F3"];

function GroupSheet({
  group,
  categories,
  onClose,
}: {
  group: Group | null;
  categories: { id: string; name: string; icon: string; type: string }[];
  onClose: () => void;
}) {
  const [name, setName] = useState(group?.name ?? "");
  const [icon, setIcon] = useState(group?.icon ?? "💳");
  const [color, setColor] = useState(group?.color ?? GROUP_COLORS[0]);
  const [catIds, setCatIds] = useState<string[]>(group?.categoryIds ?? []);
  const [merchants, setMerchants] = useState((group?.merchants ?? []).join(", "));

  const toggle = (id: string) =>
    setCatIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  async function save() {
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      icon,
      color,
      categoryIds: catIds,
      merchants: merchants.split(",").map((m) => m.trim().toLowerCase()).filter(Boolean),
    };
    if (group) await updateGroup(group.id, payload);
    else await addGroup(payload);
    onClose();
  }

  const expenseCats = categories.filter((c) => c.type === "expense");

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={onClose}>
      <div className="safe-bottom max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-content">{group ? "Edit group" : "New group"}</h2>
          <button onClick={onClose} className="text-faint"><X size={22} /></button>
        </div>

        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: color + "22" }}>
            <CategoryIcon name={icon} size={24} />
          </span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name (e.g. Credit cards)" className="input flex-1" />
        </div>

        <input value={icon} onChange={(e) => setIcon(e.target.value.slice(0, 4))} placeholder="Emoji" className="input mb-3 w-24 text-center text-lg" maxLength={4} />

        <p className="mb-1.5 text-xs font-medium text-muted">Color</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {GROUP_COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} className={`h-8 w-8 rounded-full ${color === c ? "ring-2 ring-offset-2 ring-offset-surface" : ""}`} style={{ backgroundColor: c }} />
          ))}
        </div>

        <p className="mb-1.5 text-xs font-medium text-muted">Include categories</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {expenseCats.map((c) => (
            <button
              key={c.id}
              onClick={() => toggle(c.id)}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm ${catIds.includes(c.id) ? "bg-brand-500 text-white" : "bg-surface-2 text-muted"}`}
            >
              <CategoryIcon name={c.icon} size={14} /> {c.name}
            </button>
          ))}
        </div>

        <label className="mb-4 block">
          <span className="mb-1 block text-xs font-medium text-muted">Include merchants (comma-separated)</span>
          <input value={merchants} onChange={(e) => setMerchants(e.target.value)} placeholder="advanzia, amex, visa" className="input" />
        </label>

        <div className="flex gap-2">
          <button onClick={save} disabled={!name.trim()} className="btn-primary flex-1 disabled:opacity-40">
            {group ? "Save" : "Create group"}
          </button>
          {group && (
            <button onClick={async () => { if (confirm(`Delete group "${group.name}"?`)) { await deleteGroup(group.id); onClose(); } }} className="flex h-12 w-12 items-center justify-center rounded-xl border border-line text-red-500">
              <Trash2 size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
