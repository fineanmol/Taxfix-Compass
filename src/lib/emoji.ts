/** A curated, searchable emoji set for category icons. */
export interface EmojiEntry {
  e: string;
  k: string; // space-separated keywords
}

export const EMOJI_SET: EmojiEntry[] = [
  { e: "🍔", k: "food burger meal eat fastfood" },
  { e: "🍕", k: "food pizza italian" },
  { e: "🍜", k: "food noodles ramen asian soup" },
  { e: "🍣", k: "food sushi japanese" },
  { e: "🥗", k: "food salad healthy" },
  { e: "☕", k: "coffee cafe drink tea latte" },
  { e: "🍺", k: "beer drink alcohol pub bar" },
  { e: "🍷", k: "wine drink alcohol" },
  { e: "🛒", k: "groceries shopping cart supermarket food" },
  { e: "🛍️", k: "shopping bags retail store" },
  { e: "👕", k: "clothing shirt clothes fashion apparel" },
  { e: "👟", k: "shoes sneakers footwear" },
  { e: "💄", k: "beauty makeup cosmetics personal care" },
  { e: "💇", k: "haircut salon barber personal care beauty" },
  { e: "🚗", k: "car transport vehicle auto drive" },
  { e: "⛽", k: "fuel gas petrol station car" },
  { e: "🚌", k: "bus transport public transit" },
  { e: "🚕", k: "taxi cab transport uber" },
  { e: "🚆", k: "train rail transport metro" },
  { e: "✈️", k: "flight plane travel airline trip" },
  { e: "🏠", k: "home house rent mortgage" },
  { e: "🏢", k: "office building business work" },
  { e: "💡", k: "utilities electric light power bill energy" },
  { e: "🔌", k: "utilities power electric plug" },
  { e: "🚿", k: "water utilities shower bill" },
  { e: "🧾", k: "bills receipt invoice payment tax" },
  { e: "📱", k: "phone mobile bill subscription tech" },
  { e: "💻", k: "computer laptop tech work electronics" },
  { e: "🎬", k: "entertainment movie cinema film" },
  { e: "🎮", k: "games gaming entertainment console" },
  { e: "🎵", k: "music entertainment audio song spotify" },
  { e: "📚", k: "books education reading study" },
  { e: "🎓", k: "education school university tuition study" },
  { e: "🏋️", k: "gym fitness workout exercise health" },
  { e: "❤️‍🩹", k: "health medical care wellness" },
  { e: "💊", k: "health medicine pharmacy pills medical" },
  { e: "🏥", k: "hospital health medical clinic doctor" },
  { e: "🐾", k: "pets animals dog cat vet" },
  { e: "🍼", k: "baby kids children childcare" },
  { e: "🎁", k: "gift present birthday donation" },
  { e: "🎉", k: "party celebration event fun" },
  { e: "🏖️", k: "vacation holiday beach travel leisure" },
  { e: "⚽", k: "sports football soccer hobby fitness" },
  { e: "🔧", k: "repairs maintenance tools fix home" },
  { e: "🌱", k: "garden plants nature home" },
  { e: "🏛️", k: "tax government fees legal bank" },
  { e: "🔁", k: "subscription recurring transfer repeat" },
  { e: "💰", k: "salary income money cash earnings wage" },
  { e: "💵", k: "cash money income dollar" },
  { e: "💼", k: "work business freelance job briefcase" },
  { e: "📈", k: "investment stocks trading growth income" },
  { e: "🏦", k: "bank interest savings finance" },
  { e: "↩️", k: "refund return reimburse income" },
  { e: "💳", k: "card credit debit payment" },
  { e: "🐷", k: "savings piggy bank money" },
  { e: "📦", k: "other misc package delivery" },
  { e: "⭐", k: "favorite star other special" },
];

/** Filter emoji by a search query against their keywords/char. */
export function searchEmoji(query: string): string[] {
  const q = query.trim().toLowerCase();
  const list = q
    ? EMOJI_SET.filter((x) => x.e === q || x.k.includes(q) || x.k.split(" ").some((w) => w.startsWith(q)))
    : EMOJI_SET;
  return list.map((x) => x.e);
}
