import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, X } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { IconButton } from "@/components/ui";
import { useCategories } from "@/hooks/useData";
import { addCategory, updateCategory, deleteCategory } from "@/db/mutations";
import type { Category, TxType } from "@/db/types";

// icon names available in the picker (must exist in CategoryIcon's map)
const ICON_CHOICES = [
  "UtensilsCrossed", "Coffee", "ShoppingCart", "ShoppingBag", "Shirt",
  "Car", "Fuel", "Plane", "Home", "Zap",
  "ReceiptText", "Smartphone", "Clapperboard", "Dumbbell", "HeartPulse",
  "GraduationCap", "PawPrint", "Baby", "Gift", "Briefcase",
  "Wallet", "PiggyBank", "Landmark", "CreditCard", "Banknote",
  "TrendingUp", "MoreHorizontal",
];

const COLOR_CHOICES = [
  "#FF3B30", "#FF9500", "#FFCC00", "#34C759", "#00C7BE",
  "#5AC8FA", "#0066CC", "#5856D6", "#AF52DE", "#FF2D55", "#8E8E93",
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
  return (
    <section>
      <div className="mb-1 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-muted">{title}</h2>
        <IconButton icon={Plus} label={`Add ${title} category`} onClick={onAdd} />
      </div>
      <div className="card divide-y divide-line p-1">
        {items.map((c) => (
          <button
            key={c.id}
            onClick={() => onEdit(c)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left active:bg-surface-2"
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: c.color + "22", color: c.color }}
            >
              <CategoryIcon name={c.icon} size={18} />
            </span>
            <span className="flex-1 font-medium text-content">{c.name}</span>
            <span className="text-xs text-faint">Edit</span>
          </button>
        ))}
        {items.length === 0 && (
          <p className="px-3 py-4 text-center text-sm text-faint">No categories.</p>
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
  const [icon, setIcon] = useState(category?.icon ?? "MoreHorizontal");
  const [color, setColor] = useState(category?.color ?? COLOR_CHOICES[6]);

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

        {/* icon picker */}
        <p className="mb-1.5 text-xs font-medium text-muted">Icon</p>
        <div className="mb-4 grid grid-cols-6 gap-2">
          {ICON_CHOICES.map((ic) => (
            <button
              key={ic}
              onClick={() => setIcon(ic)}
              className={`flex h-11 items-center justify-center rounded-xl transition ${
                icon === ic ? "text-white" : "bg-surface-2 text-muted"
              }`}
              style={icon === ic ? { backgroundColor: color } : undefined}
              aria-label={ic}
            >
              <CategoryIcon name={ic} size={20} />
            </button>
          ))}
        </div>

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
