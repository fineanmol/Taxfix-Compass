import { useEffect, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { Wallet } from "lucide-react";
import { BottomTabBar } from "./components/BottomTabBar";
import { ensureSeeded } from "./lib/seed";
import { materializeRecurring } from "./lib/recurring";
import { useSettings } from "./store/useSettings";
import { watchSystemTheme } from "./lib/theme";

import Dashboard from "./pages/Dashboard";
import Insights from "./pages/Insights";
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

  useEffect(() => {
    (async () => {
      await ensureSeeded();
      await loadSettings();
      await materializeRecurring();
      setReady(true);
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

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <main className={hideTabBar ? "" : "pb-24"}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/insights" element={<Insights />} />
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
      {!hideTabBar && <BottomTabBar />}
    </div>
  );
}
