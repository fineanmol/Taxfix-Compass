import { db } from "@/db/db";
import { relabelCurrency } from "@/db/mutations";
import { CURRENCIES } from "./money";

const REGION_CURRENCY: Record<string, string> = {
  US: "USD", CA: "CAD", GB: "GBP", AU: "AUD", CH: "CHF", CN: "CNY", JP: "JPY",
  IN: "INR", AE: "AED",
  DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", IE: "EUR", PT: "EUR",
  AT: "EUR", BE: "EUR", FI: "EUR", GR: "EUR", LT: "EUR", LV: "EUR", EE: "EUR",
  SK: "EUR", SI: "EUR", LU: "EUR", CY: "EUR", MT: "EUR",
};

function localeCurrency(): string | null {
  try {
    const region =
      new Intl.Locale(navigator.language).maximize().region ??
      navigator.language.split("-")[1]?.toUpperCase();
    const code = region ? REGION_CURRENCY[region] : undefined;
    if (code && CURRENCIES.some((c) => c.code === code)) return code;
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * One-time helper: if the device locale implies a different currency than the
 * one the app data is in (e.g. EUR user with USD-seeded data), offer to switch
 * everything over. Guarded by a localStorage flag so it only asks once.
 */
export async function maybeOfferCurrencyFix(): Promise<void> {
  if (localStorage.getItem("currencyFixDismissed") === "1") return;

  const settings = await db.settings.get("app");
  if (!settings) return;
  const target = localeCurrency();
  if (!target || target === settings.currency) return;

  // only bother if there's data to relabel
  const txCount = await db.transactions.count();

  const ok = confirm(
    `Your device is set to ${target}, but Spend is showing ${settings.currency}.\n\n` +
      `Switch everything to ${target}? (Relabels ${txCount} transaction(s) and your accounts — ` +
      `amounts stay the same, no exchange-rate conversion.)`
  );
  localStorage.setItem("currencyFixDismissed", "1");
  if (ok) {
    await db.settings.update("app", { currency: target });
    await relabelCurrency(target);
    location.reload();
  }
}
