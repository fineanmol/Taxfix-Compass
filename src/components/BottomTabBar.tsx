import { NavLink, useNavigate } from "react-router-dom";
import { Home, PieChart, Plus, ReceiptText, Settings } from "lucide-react";

const tabs = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/transactions", label: "Activity", icon: ReceiptText },
  { to: "/insights", label: "Insights", icon: PieChart },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function BottomTabBar() {
  const navigate = useNavigate();
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur">
      <div className="relative mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {tabs.slice(0, 2).map((t) => (
          <Tab key={t.to} {...t} />
        ))}

        {/* center FAB → quick add */}
        <button
          aria-label="Add transaction"
          onClick={() => navigate("/add")}
          className="-mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-brand-700 text-white shadow-lg shadow-brand-300 active:scale-95 transition"
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>

        {tabs.slice(2).map((t) => (
          <Tab key={t.to} {...t} />
        ))}
      </div>
    </nav>
  );
}

function Tab({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex w-16 flex-col items-center gap-0.5 py-1 text-[11px] font-medium transition ${
          isActive ? "text-brand-700" : "text-faint"
        }`
      }
    >
      <Icon size={22} />
      {label}
    </NavLink>
  );
}
