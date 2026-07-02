import { useEffect, useState } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { Wallet, Plus } from "lucide-react";
import { BottomTabBar } from "./components/BottomTabBar";
import { ensureSeeded } from "./lib/seed";
import { materializeRecurring } from "./lib/recurring";
import { useSettings } from "./store/useSettings";
import { watchSystemTheme } from "./lib/theme";
import { maybeOfferCurrencyFix } from "./lib/currencyFix";

import Activity from "./pages/Insights";
import Summary from "./pages/Dashboard";
import Overview from "./pages/Overview";
import AddTransaction from "./pages/AddTransaction";
import EditTransaction from "./pages/EditTransaction";
import Transactions from "./pages/Transactions";
import Accounts from "./pages/Accounts";
import Budgets from "./pages/Budgets";
import Categories from "./pages/Categories";
import QuickAdd from "./pages/QuickAdd";
import SetupQuickAdd from "./pages/SetupQuickAdd";
import ImportStatement from "./pages/ImportStatement";
import Detail from "./pages/Detail";
import Groups from "./pages/Groups";
import SettingsPage from "./pages/Settings";

// routes shown full-screen (no bottom tab bar)
const FULLSCREEN = ["/add", "/quick"];

export default function App() {
  const [ready, setReady] = useState(false);
  const loadSettings = useSettings((s) => s.load);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      await ensureSeeded();
      await loadSettings();
      await materializeRecurring();
      setReady(true);
      // one-time: offer to fix currency if device locale differs from data
      maybeOfferCurrencyFix();
    })();
    // keep in sync with OS theme changes while in "system" mode
    return watchSystemTheme(() => useSettings.getState().settings?.theme ?? "system");
  }, [loadSettings]);

  if (!ready) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <div className="flex h-16 w-16 animate-pulse items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-fab">
          <Wallet size={30} />
        </div>
        <div className="text-xl font-bold tracking-tight text-content">Spend</div>
      </div>
    );
  }

  const hideTabBar =
    FULLSCREEN.includes(location.pathname) || location.pathname.startsWith("/edit/");

  // show the floating add button on the main tabbed screens
  const showFab = !hideTabBar;

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <main className={hideTabBar ? "" : "pb-28"}>
        <Routes>
          <Route path="/" element={<Activity />} />
          <Route path="/summary" element={<Summary />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/add" element={<AddTransaction />} />
          <Route path="/quick" element={<QuickAdd />} />
          <Route path="/setup-quickadd" element={<SetupQuickAdd />} />
          <Route path="/edit/:id" element={<EditTransaction />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/detail" element={<Detail />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/import" element={<ImportStatement />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>

      {showFab && (
        <button
          onClick={() => navigate("/add")}
          aria-label="Add transaction"
          className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-900 shadow-fab active:scale-95 transition"
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>
      )}

      {!hideTabBar && <BottomTabBar />}
    </div>
  );
}
