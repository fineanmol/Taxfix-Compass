import type { LucideIcon } from "lucide-react";

/** Large page title with optional trailing action(s). */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-end justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-content">{title}</h1>
        {subtitle && <p className="text-sm text-faint">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

/** Round icon button used for header actions (add, transfer, etc.). */
export function IconButton({
  icon: Icon,
  onClick,
  label,
  variant = "ghost",
  disabled,
}: {
  icon: LucideIcon;
  onClick: () => void;
  label: string;
  variant?: "ghost" | "primary";
  disabled?: boolean;
}) {
  const base = "flex h-10 w-10 items-center justify-center rounded-full transition active:scale-95 disabled:opacity-40";
  const styles =
    variant === "primary"
      ? "bg-brand-500 text-white shadow-card"
      : "bg-surface text-content shadow-card";
  return (
    <button aria-label={label} onClick={onClick} disabled={disabled} className={`${base} ${styles}`}>
      <Icon size={20} />
    </button>
  );
}

/** Centered empty state with an icon, message and optional action. */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-14 text-center">
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-faint">
        <Icon size={26} />
      </span>
      <p className="font-semibold text-content">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-sm text-faint">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
