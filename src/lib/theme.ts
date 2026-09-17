import type { ThemePref } from "@/db/types";

const mq = () => window.matchMedia("(prefers-color-scheme: dark)");

/** Resolve a preference to the actual dark boolean. */
export function isDark(pref: ThemePref): boolean {
  if (pref === "system") return mq().matches;
  return pref === "dark";
}

/** Toggle the <html class="dark"> and theme-color meta to match the preference. */
export function applyTheme(pref: ThemePref): void {
  const dark = isDark(pref);
  document.documentElement.classList.toggle("dark", dark);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", dark ? "#154618" : "#36893B");
}

/** Re-apply on OS theme change while in "system" mode. Returns an unsubscribe fn. */
export function watchSystemTheme(getPref: () => ThemePref): () => void {
  const handler = () => {
    if (getPref() === "system") applyTheme("system");
  };
  const m = mq();
  m.addEventListener("change", handler);
  return () => m.removeEventListener("change", handler);
}
