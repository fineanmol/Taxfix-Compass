import { useMemo, useState } from "react";
import {
  Sparkles,
  ChevronRight,
  Check,
  Gift,
  Shield,
  Flame,
  X,
} from "lucide-react";
import dayjs from "dayjs";
import { useCategories, useTransactionsInRange } from "@/hooks/useData";
import { spendByCategory } from "@/lib/calc";
import {
  PRODUCT_OFFERS,
  rankTaxOffers,
  type ProductOffer,
  type TaxOffer,
} from "@/lib/forYouOffers";

type Toast = { kind: "product" | "tax"; message: string } | null;

export default function ForYou() {
  const categories = useCategories();
  const yearStart = dayjs().startOf("year").valueOf();
  const yearEnd = dayjs().endOf("year").valueOf();
  const txs = useTransactionsInRange(yearStart, yearEnd);

  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [claimed, setClaimed] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<Toast>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductOffer | null>(null);

  const categorySpend = useMemo(() => {
    const slices = spendByCategory(txs);
    const map: Record<string, number> = {};
    for (const s of slices) {
      const cat = categories.find((c) => c.id === s.categoryId);
      if (cat) map[cat.name] = s.total;
    }
    return map;
  }, [txs, categories]);

  const taxOffers = useMemo(() => rankTaxOffers(categorySpend), [categorySpend]);

  const estimatedTotal = taxOffers
    .filter((o) => applied.has(o.id))
    .reduce((sum, o) => sum + parseEstimate(o.estimate), 0);

  const forecastBase = 840;
  const forecast = forecastBase + estimatedTotal;

  function showToast(kind: "product" | "tax", message: string) {
    setToast({ kind, message });
    window.setTimeout(() => setToast(null), 2400);
  }

  function applyTax(offer: TaxOffer) {
    setApplied((prev) => {
      const next = new Set(prev);
      if (next.has(offer.id)) next.delete(offer.id);
      else next.add(offer.id);
      return next;
    });
    if (!applied.has(offer.id)) {
      showToast("tax", `${offer.title} added to your TaxFix return`);
    }
  }

  function claimProduct(offer: ProductOffer) {
    setClaimed((prev) => new Set(prev).add(offer.id));
    setSelectedProduct(null);
    showToast("product", `${offer.brand} — we'll open this for you soon`);
  }

  return (
    <div className="safe-top relative pb-2">
      {/* Cred-style dark hero band */}
      <section className="relative overflow-hidden px-4 pb-6 pt-4">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% -10%, rgba(47,155,128,0.35), transparent 55%), radial-gradient(ellipse 70% 50% at 90% 20%, rgba(43,127,158,0.28), transparent 50%)",
          }}
        />
        <header className="relative flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-400">
              For you
            </p>
            <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-tight text-content">
              Win more from
              <br />
              your money
            </h1>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface shadow-card">
            <Sparkles size={20} className="text-brand-500" />
          </div>
        </header>

        {/* Living refund forecast card */}
        <div className="relative mt-5 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 p-5 text-white shadow-card">
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-teal-400/20 blur-2xl" />
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-teal-200/90">
            <Flame size={14} />
            TaxFix forecast · {dayjs().year()}
          </div>
          <p className="mt-3 text-4xl font-bold tracking-tight tabular-nums">
            €{forecast.toLocaleString("de-DE")}
          </p>
          <p className="mt-1 text-sm text-white/70">
            Estimated refund if you apply the offers below
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-teal-100">
              {applied.size} offer{applied.size === 1 ? "" : "s"} applied
            </span>
            {estimatedTotal > 0 && (
              <span className="rounded-full bg-teal-400/20 px-3 py-1 text-xs font-semibold text-teal-200">
                +€{estimatedTotal} unlocked
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Product offerings carousel — Cred style */}
      <section className="space-y-3">
        <div className="flex items-end justify-between px-4">
          <div>
            <h2 className="text-lg font-bold text-content">Worth checking out</h2>
            <p className="text-sm text-muted">Products that pair with your spending</p>
          </div>
          <Gift size={18} className="mb-1 text-faint" />
        </div>

        <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
          {PRODUCT_OFFERS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedProduct(p)}
              className="relative w-[240px] shrink-0 overflow-hidden rounded-[28px] p-4 text-left text-white shadow-card transition active:scale-[0.98]"
              style={{ background: p.gradient, minHeight: 196 }}
            >
              <div className="flex items-start justify-between">
                <span className="text-3xl">{p.emoji}</span>
                {p.badge && (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    style={{ backgroundColor: "rgba(255,255,255,0.16)", color: p.accent }}
                  >
                    {p.badge}
                  </span>
                )}
              </div>
              <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                {p.brand}
              </p>
              <h3 className="mt-1 text-[17px] font-bold leading-snug">{p.title}</h3>
              <p className="mt-1.5 line-clamp-2 text-xs text-white/65">{p.subtitle}</p>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold" style={{ color: p.accent }}>
                {claimed.has(p.id) ? "Claimed" : p.cta}
                <ChevronRight size={14} />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* TaxFix offers */}
      <section className="mt-7 space-y-3 px-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-lg font-bold text-content">TaxFix offers</h2>
            <p className="text-sm text-muted">Personalized from your year so far</p>
          </div>
          <Shield size={18} className="mb-1 text-faint" />
        </div>

        <div className="space-y-3">
          {taxOffers.map((offer) => {
            const isOn = applied.has(offer.id);
            return (
              <article
                key={offer.id}
                className={`overflow-hidden rounded-3xl border bg-surface shadow-card transition ${
                  isOn ? "border-brand-400/50" : "border-line/60"
                }`}
              >
                <div className="flex gap-3 p-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${
                      isOn
                        ? "bg-brand-gradient text-white"
                        : "bg-surface-2 text-brand-600 dark:text-brand-300"
                    }`}
                  >
                    {offer.estimate}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold text-content">{offer.title}</h3>
                      <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                        {offer.tag}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-snug text-muted">{offer.reason}</p>
                    <button
                      type="button"
                      onClick={() => applyTax(offer)}
                      className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-[0.98] ${
                        isOn
                          ? "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200"
                          : "bg-content text-bg"
                      }`}
                    >
                      {isOn ? (
                        <>
                          <Check size={14} strokeWidth={2.5} />
                          Applied
                        </>
                      ) : (
                        <>
                          {offer.cta}
                          <ChevronRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <p className="mt-6 px-4 text-center text-[11px] leading-relaxed text-faint">
        Estimates are illustrative for the hackathon demo · not tax advice
      </p>

      {/* Product detail sheet */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 backdrop-blur-sm">
          <div
            className="w-full max-w-md overflow-hidden rounded-[28px] bg-surface shadow-fab"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="relative px-5 pb-4 pt-5 text-white"
              style={{ background: selectedProduct.gradient }}
            >
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSelectedProduct(null)}
                className="absolute right-4 top-4 rounded-full bg-black/25 p-1.5"
              >
                <X size={16} />
              </button>
              <span className="text-4xl">{selectedProduct.emoji}</span>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
                {selectedProduct.brand}
              </p>
              <h3 className="mt-1 text-2xl font-bold leading-tight">{selectedProduct.title}</h3>
              <p className="mt-2 text-sm text-white/75">{selectedProduct.subtitle}</p>
            </div>
            <div className="space-y-3 p-5">
              <p className="text-sm text-muted">
                Partner offer curated for TaxFix users. Buying here keeps receipts
                ready for your next return — and may unlock extra deductions.
              </p>
              <button
                type="button"
                onClick={() => claimProduct(selectedProduct)}
                className="btn-primary w-full"
              >
                {claimed.has(selectedProduct.id) ? "Already claimed" : selectedProduct.cta}
              </button>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="w-full rounded-xl py-2.5 text-sm font-medium text-muted"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-28 z-50 flex justify-center px-4">
          <div className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-fab">
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}

function parseEstimate(estimate: string): number {
  const n = Number(estimate.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
