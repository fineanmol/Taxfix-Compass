import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, X, Search, GripVertical } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { IconButton } from "@/components/ui";
import { DragList } from "@/components/DragList";
import { useCategories } from "@/hooks/useData";
import { addCategory, updateCategory, deleteCategory, reorderCategories } from "@/db/mutations";
import { searchEmoji } from "@/lib/emoji";
import type { Category, TxType } from "@/db/types";


const COLOR_CHOICES = [
  "#FF3B30", "#F8A21A", "#F8C677", "#36893B", "#154618",
  "#668CFF", "#B6C5F3", "#BC73F2", "#DBB9F3", "#9A9288", "#0C0B0A",
];

export default function Categories() {
  const navigate = useNavigate();
  const categories = useCategories();
  const [editing, setEditing] = useState<Category | null>(null);
  const [creatingType, setCreatingType] = useState<TxType | null>(null);

  const expense = categories.filter((c) => c.type === "expense");
  const income = categories.filter((c) => c.type === "income");

  return (
    <div className="safe-top space-y-5 px-4 pt-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-content">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface shadow-card">
            <ArrowLeft size={18} />
          </span>
          <span className="text-2xl font-bold tracking-tight">Categories</span>
        </button>
      </div>

      <Group
        title="Expenses"
        items={expense}
        onAdd={() => setCreatingType("expense")}
        onEdit={setEditing}
      />
      <Group
        title="Income"
        items={income}
        onAdd={() => setCreatingType("income")}
        onEdit={setEditing}
      />

      {(editing || creatingType) && (
        <CategorySheet
          category={editing}
          type={editing?.type ?? creatingType ?? "expense"}
          onClose={() => {
            setEditing(null);
            setCreatingType(null);
          }}
        />
      )}
    </div>
  );
}

function Group({
  title,
  items,
  onAdd,
  onEdit,
}: {
  title: string;
  items: Category[];
  onAdd: () => void;
  onEdit: (c: Category) => void;
}) {
  // reorder within this group only; persist the merged order for its ids
  function handleReorder(orderedIds: string[]) {
    reorderCategories(orderedIds);
  }

  return (
    <section>
      <div className="mb-1 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-muted">{title}</h2>
        <IconButton icon={Plus} label={`Add ${title} category`} onClick={onAdd} />
      </div>
      <div className="card p-1">
        {items.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-faint">No categories.</p>
        ) : (
          <DragList
            items={items}
            onReorder={handleReorder}
            renderItem={(c) => (
              <div className="flex items-center gap-2 rounded-xl px-2 py-2.5">
                <span
                  data-draghandle
                  className="cursor-grab touch-none px-1 text-faint active:cursor-grabbing"
                  aria-label="Drag to reorder"
                >
                  <GripVertical size={18} />
                </span>
                <button onClick={() => onEdit(c)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: c.color + "22", color: c.color }}
                  >
                    <CategoryIcon name={c.icon} size={18} />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium text-content">{c.name}</span>
                  <span className="shrink-0 text-xs text-faint">Edit</span>
                </button>
              </div>
            )}
          />
        )}
      </div>
    </section>
  );
}

function CategorySheet({
  category,
  type,
  onClose,
}: {
  category: Category | null;
  type: TxType;
  onClose: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [icon, setIcon] = useState(category?.icon ?? "📦");
  const [color, setColor] = useState(category?.color ?? COLOR_CHOICES[6]);
  const [emojiQuery, setEmojiQuery] = useState("");
  const emojiResults = searchEmoji(emojiQuery);

  async function save() {
    if (!name.trim()) return;
    if (category) await updateCategory(category.id, { name: name.trim(), icon, color });
    else await addCategory({ name: name.trim(), icon, color, type });
    onClose();
  }

  async function remove() {
    if (!category) return;
    if (confirm(`Delete "${category.name}"? Existing transactions keep their data but lose this label.`)) {
      await deleteCategory(category.id);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="safe-bottom max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-content">
            {category ? "Edit category" : "New category"}
          </h2>
          <button onClick={onClose} className="text-faint">
            <X size={22} />
          </button>
        </div>

        {/* live preview */}
        <div className="mb-4 flex items-center gap-3">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ backgroundColor: color + "22", color }}
          >
            <CategoryIcon name={icon} size={24} />
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Category name"
            className="input flex-1"
          />
        </div>

        {/* color picker */}
        <p className="mb-1.5 text-xs font-medium text-muted">Color</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {COLOR_CHOICES.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`h-8 w-8 rounded-full transition ${color === c ? "ring-2 ring-offset-2 ring-offset-surface" : ""}`}
              style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }}
              aria-label={c}
            />
          ))}
        </div>

        {/* emoji picker with search */}
        <p className="mb-1.5 text-xs font-medium text-muted">Icon</p>
        <div className="mb-2 flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
          <Search size={16} className="text-faint" />
          <input
            value={emojiQuery}
            onChange={(e) => setEmojiQuery(e.target.value)}
            placeholder="Search emoji (e.g. coffee, car, rent)…"
            className="w-full bg-transparent text-sm text-content outline-none placeholder:text-faint"
          />
        </div>
        <div className="mb-2 grid max-h-40 grid-cols-8 gap-1.5 overflow-y-auto">
          {emojiResults.map((ic) => (
            <button
              key={ic}
              onClick={() => setIcon(ic)}
              className={`flex h-9 items-center justify-center rounded-lg transition ${
                icon === ic ? "bg-surface ring-2 ring-brand-500" : "bg-surface-2"
              }`}
              aria-label={ic}
            >
              <CategoryIcon name={ic} size={20} />
            </button>
          ))}
          {emojiResults.length === 0 && (
            <p className="col-span-8 py-3 text-center text-xs text-faint">
              No match — type/paste any emoji below
            </p>
          )}
        </div>
        {/* allow any emoji via the keyboard's emoji key */}
        <input
          value={icon}
          onChange={(e) => setIcon(e.target.value.slice(0, 4))}
          placeholder="Or type/paste any emoji"
          className="input mb-4 text-center text-lg"
          maxLength={4}
        />

        <div className="flex gap-2">
          <button onClick={save} disabled={!name.trim()} className="btn-primary flex-1 disabled:opacity-40">
            {category ? "Save" : "Add category"}
          </button>
          {category && (
            <button
              onClick={remove}
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-line text-red-500"
              aria-label="Delete category"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
