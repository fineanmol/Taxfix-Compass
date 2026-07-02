/**
 * Category icons are now emoji stored directly in the category's `icon` field
 * (e.g. "🍔"). For data seeded before the switch — which stored Lucide names
 * like "UtensilsCrossed" — we map the old names to an emoji so nothing breaks.
 */
const LEGACY_NAME_TO_EMOJI: Record<string, string> = {
  UtensilsCrossed: "🍔",
  ShoppingCart: "🛒",
  Car: "🚗",
  ShoppingBag: "🛍️",
  ReceiptText: "🧾",
  Clapperboard: "🎬",
  HeartPulse: "❤️‍🩹",
  Home: "🏠",
  Plane: "✈️",
  MoreHorizontal: "📦",
  Wallet: "💰",
  Gift: "🎁",
  TrendingUp: "📈",
  ArrowLeftRight: "🔄",
  Circle: "⚪",
  Coffee: "☕",
  Fuel: "⛽",
  Dumbbell: "🏋️",
  GraduationCap: "🎓",
  PawPrint: "🐾",
  Shirt: "👕",
  Smartphone: "📱",
  Zap: "⚡",
  Baby: "🍼",
  Briefcase: "💼",
  PiggyBank: "🐷",
  Landmark: "🏦",
  CreditCard: "💳",
  Banknote: "💵",
};

/** Resolve a stored icon value to an emoji (handles emoji or legacy names). */
export function resolveEmoji(icon: string): string {
  if (!icon) return "📦";
  // if it maps from a legacy Lucide name, convert; otherwise assume it's emoji
  return LEGACY_NAME_TO_EMOJI[icon] ?? icon;
}

/** Render a category's emoji at a given pixel size. */
export function CategoryIcon({
  name,
  size = 24,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={className}
      style={{ fontSize: size, lineHeight: 1, display: "inline-block" }}
      aria-hidden
    >
      {resolveEmoji(name)}
    </span>
  );
}
