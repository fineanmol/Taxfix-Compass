import { NavLink } from "react-router-dom";
import { Receipt, PieChart, Target, Sparkles, Compass } from "lucide-react";

const tabs = [
  { to: "/", label: "Activity", icon: Receipt, end: true },
  { to: "/summary", label: "Summary", icon: PieChart },
  { to: "/budgets", label: "Budget", icon: Target },
  { to: "/for-you", label: "For You", icon: Sparkles },
  { to: "/explore", label: "Explore", icon: Compass },
];

export function BottomTabBar() {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 px-3 pb-4">
      <div className="mx-auto flex h-[68px] max-w-md items-center justify-around rounded-[40px] border border-line bg-surface/90 px-1 shadow-card backdrop-blur">
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
        `flex flex-1 flex-col items-center gap-1 rounded-[22px] py-2 text-[10px] transition ${
          isActive ? "bg-brand-500 font-semibold text-white" : "font-medium text-faint"
        }`
      }
    >
      <Icon size={22} />
      {label}
    </NavLink>
  );
}
