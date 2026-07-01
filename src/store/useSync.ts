import { create } from "zustand";
import { supabase, syncConfigured, syncTransactions } from "@/lib/sync";

interface SyncState {
  email: string | null;
  userId: string | null;
  status: "idle" | "syncing" | "error";
  message: string;
  init: () => Promise<void>;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
}

export const useSync = create<SyncState>((set, get) => ({
  email: null,
  userId: null,
  status: "idle",
  message: "",

  init: async () => {
    if (!syncConfigured) return;
    const sb = supabase();
    if (!sb) return;
    const { data } = await sb.auth.getSession();
    const user = data.session?.user;
    if (user) set({ userId: user.id, email: user.email ?? null });
    sb.auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      set({ userId: u?.id ?? null, email: u?.email ?? null });
    });
  },

  // magic-link sign in (no passwords to store — matches privacy posture)
  signIn: async (email) => {
    const sb = supabase();
    if (!sb) return;
    set({ status: "syncing", message: "Sending link…" });
    const { error } = await sb.auth.signInWithOtp({ email });
    set({
      status: error ? "error" : "idle",
      message: error ? error.message : "Check your email for a sign-in link.",
    });
  },

  signOut: async () => {
    const sb = supabase();
    if (!sb) return;
    await sb.auth.signOut();
    set({ userId: null, email: null, message: "" });
  },

  syncNow: async () => {
    const { userId } = get();
    if (!userId) return;
    set({ status: "syncing", message: "Syncing…" });
    try {
      const res = await syncTransactions(userId);
      set({ status: "idle", message: `Synced · ↑${res.pushed} ↓${res.pulled}` });
    } catch (e) {
      set({ status: "error", message: e instanceof Error ? e.message : "Sync failed" });
    }
  },
}));
