import { NavLink } from "react-router-dom";
import { Receipt, PieChart, Target, BarChart3, Settings } from "lucide-react";

const tabs = [
  { to: "/", label: "Activity", icon: Receipt, end: true },
  { to: "/summary", label: "Summary", icon: PieChart },
  { to: "/budgets", label: "Budget", icon: Target },
  { to: "/overview", label: "Overview", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function BottomTabBar() {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 px-4 pb-3">
      <div className="mx-auto flex max-w-md items-center justify-around rounded-full border border-line bg-surface/90 px-1 py-2 shadow-card backdrop-blur">
        {tabs.map((t) => (
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
  icon: typeof Receipt;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 text-[11px] font-medium transition ${
          isActive ? "bg-surface-2 text-content" : "text-faint"
        }`
      }
    >
      <Icon size={20} />
      {label}
    </NavLink>
  );
}
