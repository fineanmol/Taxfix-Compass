export type ProductOffer = {
  id: string;
  brand: string;
  title: string;
  subtitle: string;
  badge?: string;
  cta: string;
  gradient: string;
  accent: string;
  emoji: string;
};

export type TaxOffer = {
  id: string;
  title: string;
  reason: string;
  estimate: string;
  tag: string;
  /** Category name hints used to personalize ranking */
  triggers: string[];
  cta: string;
};

/** Cred-style partner / product offerings users can buy */
export const PRODUCT_OFFERS: ProductOffer[] = [
  {
    id: "jobrad",
    brand: "JobRad",
    title: "Lease a bike, save on tax",
    subtitle: "Salary-sacrifice e-bike · up to €1,200/yr benefit",
    badge: "Popular",
    cta: "Explore plans",
    gradient: "linear-gradient(135deg, #36893B 0%, #154618 60%, #0C0B0A 100%)",
    accent: "#ADEE68",
    emoji: "🚲",
  },
  {
    id: "bahncard",
    brand: "Deutsche Bahn",
    title: "BahnCard 25 Business",
    subtitle: "Commute cheaper · often deductible for employees",
    badge: "Travel",
    cta: "View offer",
    gradient: "linear-gradient(135deg, #F8A21A 0%, #F8C677 45%, #0C0B0A 100%)",
    accent: "#FFEFD3",
    emoji: "🚆",
  },
  {
    id: "health",
    brand: "Ottonova",
    title: "Private health upgrade",
    subtitle: "Compare PKV vs GKV with tax impact baked in",
    badge: "Health",
    cta: "Compare",
    gradient: "linear-gradient(135deg, #668CFF 0%, #B6C5F3 45%, #0C0B0A 100%)",
    accent: "#E8F0FF",
    emoji: "🩺",
  },
  {
    id: "desk",
    brand: "Ergonova",
    title: "Home-office desk kit",
    subtitle: "Standing desk + chair · claim as Werbungskosten",
    badge: "WFH",
    cta: "Shop kit",
    gradient: "linear-gradient(135deg, #BC73F2 0%, #DBB9F3 45%, #0C0B0A 100%)",
    accent: "#F6EBFE",
    emoji: "🪑",
  },
  {
    id: "invest",
    brand: "Trade Republic",
    title: "ETF savings plan",
    subtitle: "Invest leftover refund · auto €50/mo plans",
    badge: "Invest",
    cta: "Start plan",
    gradient: "linear-gradient(135deg, #0C0B0A 0%, #154618 70%, #36893B 100%)",
    accent: "#CEF5A4",
    emoji: "📈",
  },
  {
    id: "donation",
    brand: "Betterplace",
    title: "Donate & deduct",
    subtitle: "Verified NGOs · receipts ready for TaxFix",
    badge: "Good",
    cta: "Give now",
    gradient: "linear-gradient(135deg, #F8A21A 0%, #9A9288 55%, #0C0B0A 100%)",
    accent: "#FFEFD3",
    emoji: "❤️",
  },
];

/** TaxFix-style offers the user can apply to their return */
export const TAX_OFFERS: TaxOffer[] = [
  {
    id: "home-office",
    title: "Home-office flat rate",
    reason: "You spend on rent & utilities — claim €6/day worked from home (max €1,260).",
    estimate: "+€420",
    tag: "WFH",
    triggers: ["Rent", "Utilities", "Bills"],
    cta: "Apply offer",
  },
  {
    id: "commute",
    title: "Commute allowance",
    reason: "Transport & fuel show up often — Entfernungspauschale can add up fast.",
    estimate: "+€680",
    tag: "Commute",
    triggers: ["Transport", "Fuel"],
    cta: "Apply offer",
  },
  {
    id: "work-gear",
    title: "Work equipment",
    reason: "Shopping & education spends may qualify as Arbeitsmittel under €800.",
    estimate: "+€190",
    tag: "Gear",
    triggers: ["Shopping", "Education", "Subscriptions"],
    cta: "Apply offer",
  },
  {
    id: "health-costs",
    title: "Extraordinary medical costs",
    reason: "Health & fitness expenses above the hardship threshold can reduce tax.",
    estimate: "+€150",
    tag: "Health",
    triggers: ["Health", "Fitness"],
    cta: "Apply offer",
  },
  {
    id: "donations",
    title: "Charitable donations",
    reason: "Gifts & donations with receipts are fully deductible — we’ll attach them.",
    estimate: "+€95",
    tag: "Donate",
    triggers: ["Gifts"],
    cta: "Apply offer",
  },
  {
    id: "side-hustle",
    title: "Side-income checklist",
    reason: "Freelance income detected — claim related expenses before year-end.",
    estimate: "+€310",
    tag: "Freelance",
    triggers: ["Freelance", "Business"],
    cta: "Apply offer",
  },
  {
    id: "education",
    title: "Further education",
    reason: "Courses and books for your job are often deductible as Weiterbildung.",
    estimate: "+€220",
    tag: "Learn",
    triggers: ["Education", "Subscriptions"],
    cta: "Apply offer",
  },
];

export function rankTaxOffers(
  categorySpend: Record<string, number>
): TaxOffer[] {
  return [...TAX_OFFERS]
    .map((offer) => {
      const score = offer.triggers.reduce(
        (sum, name) => sum + (categorySpend[name] ?? 0),
        0
      );
      return { offer, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.offer);
}
