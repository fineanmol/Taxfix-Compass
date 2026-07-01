import { create } from "zustand";
import { db } from "@/db/db";
import type { Settings, ThemePref } from "@/db/types";
import { applyTheme } from "@/lib/theme";

interface SettingsState {
  settings: Settings | null;
  load: () => Promise<void>;
  update: (patch: Partial<Omit<Settings, "id">>) => Promise<void>;
  toggleHideBalances: () => Promise<void>;
  setTheme: (theme: ThemePref) => Promise<void>;
}

export const useSettings = create<SettingsState>((set, get) => ({
  settings: null,
  load: async () => {
    const s = await db.settings.get("app");
    if (s) {
      set({ settings: s });
      applyTheme(s.theme);
    }
  },
  update: async (patch) => {
    const cur = get().settings;
    if (!cur) return;
    const next = { ...cur, ...patch };
    await db.settings.put(next);
    set({ settings: next });
  },
  toggleHideBalances: async () => {
    const cur = get().settings;
    if (!cur) return;
    await get().update({ hideBalances: !cur.hideBalances });
  },
  setTheme: async (theme) => {
    applyTheme(theme);
    await get().update({ theme });
  },
}));
