import { db } from "@/db/db";
import type { Category, Transaction } from "@/db/types";
import { uid } from "./id";
import { importHash, type ParsedRow } from "./statement";

/** Keyword → category-name guesses for auto-categorizing statement rows. */
const KEYWORD_MAP: Array<{ re: RegExp; cat: string }> = [
  { re: /uber|lyft|taxi|rail|train|tfl|bus\b|metro|deutsche bahn|db vertrieb|\bdb\b|flixbus|bvg|bahn/i, cat: "Transport" },
  { re: /shell|aral|esso|\bbp\b|petrol|gas station|tankstelle|fuel/i, cat: "Fuel" },
  { re: /tesco|sainsbury|lidl|aldi|asda|waitrose|rewe|edeka|kaufland|penny|netto|dm |rossmann|flink|gorillas|getir|grocery|supermarket|market/i, cat: "Groceries" },
  { re: /restaurant|cafe|caf[eé]|coffee|starbucks|costa|mcdonald|kfc|pizza|deliveroo|just eat|uber eats|lieferando|dhaba|bakeshop|bakery|dining|\bpub\b|\bbar\b|bar /i, cat: "Food & Drink" },
  { re: /amazon|ebay|shop|store|asos|zara|h&m|primark|woolworth|action|ikea|clothing|retail/i, cat: "Shopping" },
  { re: /netflix|spotify|disney|cinema|theatre|game|steam|playstation|xbox|youtube|entertain/i, cat: "Entertainment" },
  { re: /netflix|spotify|disney\+|prime|icloud|subscription|abo\b/i, cat: "Subscriptions" },
  { re: /electric|gas bill|water|council|mortgage|insurance|hallesche|feather|vodafone|telekom|o2|broadband|internet|utility|strom|miete/i, cat: "Bills" },
  { re: /\brent\b|habyt|landlord|wohnung|immobilien/i, cat: "Rent" },
  { re: /pharmacy|apotheke|boots|doctor|dental|hospital|clinic|health/i, cat: "Health" },
  { re: /gym|fitness|mcfit|urban sports|clever fit/i, cat: "Fitness" },
  { re: /hotel|airbnb|flight|airline|ryanair|easyjet|lufthansa|booking\.com|travel/i, cat: "Travel" },
  { re: /exchanged to|robo portfolio|invest|trading|etf|crypto|advanzia/i, cat: "Investments" },
  // income
  { re: /salary|payroll|wages|gehalt|lohn|link11|payment from|from .* gmbh/i, cat: "Salary" },
  { re: /refund|erstattung|reimburse|cashback|compensation/i, cat: "Refund" },
  { re: /interest|reward|zinsen/i, cat: "Interest" },
];

function guessCategory(desc: string, categories: Category[], type: "expense" | "income"): string {
  for (const { re, cat } of KEYWORD_MAP) {
    if (re.test(desc)) {
      const match = categories.find((c) => c.name === cat && c.type === type);
      if (match) return match.id;
    }
  }
  // fall back to "Other" of the right type, else first of that type
  const other = categories.find((c) => c.name === "Other" && c.type === type);
  return other?.id ?? categories.find((c) => c.type === type)?.id ?? "";
}

export type SkipReason = "already-imported" | "duplicate-in-file" | "no-category";

export interface ImportPreviewRow extends ParsedRow {
  hash: string;
  categoryId: string;
  duplicate: boolean;
  /** why this row won't import (undefined = it will import) */
  skipReason?: SkipReason;
}

/** Build a preview: attach category guesses + dedup flags without writing. */
export async function buildPreview(
  rows: ParsedRow[],
  accountId: string
): Promise<ImportPreviewRow[]> {
  const categories = await db.categories.toArray();
  const hashes = rows.map((r) => importHash(accountId, r));
  const existing = new Set(
    (await db.transactions.where("importHash").anyOf(hashes).toArray()).map((t) => t.importHash)
  );
  // also guard against duplicates within the same file
  const seenInFile = new Set<string>();

  return rows.map((r, i) => {
    const hash = hashes[i];
    const dupInDb = existing.has(hash);
    const dupInFile = seenInFile.has(hash);
    seenInFile.add(hash);
    const categoryId = guessCategory(r.description, categories, r.type);

    let skipReason: SkipReason | undefined;
    if (dupInDb) skipReason = "already-imported";
    else if (dupInFile) skipReason = "duplicate-in-file";
    else if (!categoryId) skipReason = "no-category";

    return { ...r, hash, categoryId, duplicate: !!skipReason, skipReason };
  });
}

/** Commit the (non-duplicate, selected) preview rows to the DB. */
export async function commitImport(
  rows: ImportPreviewRow[],
  accountId: string,
  currency: string
): Promise<number> {
  const now = Date.now();
  const txs: Transaction[] = rows.map((r) => ({
    id: uid(),
    amount: r.amount,
    type: r.type,
    categoryId: r.categoryId,
    accountId,
    date: r.date,
    note: r.description,
    currency,
    importHash: r.hash,
    createdAt: now,
    updatedAt: now,
  }));
  if (txs.length) await db.transactions.bulkPut(txs);
  return txs.length;
}
