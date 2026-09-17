import dayjs from "dayjs";
import { db } from "@/db/db";
import type { Transaction } from "@/db/types";
import { uid } from "./id";

const HEADERS = ["date", "type", "amount", "category", "account", "currency", "note"] as const;

function escape(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

/** Build a CSV string of all transactions with human-readable category/account names. */
export async function exportCsv(): Promise<string> {
  const [txs, categories, accounts] = await Promise.all([
    db.transactions.orderBy("date").toArray(),
    db.categories.toArray(),
    db.accounts.toArray(),
  ]);
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const accName = new Map(accounts.map((a) => [a.id, a.name]));

  const rows = txs.map((t) =>
    [
      dayjs(t.date).format("YYYY-MM-DD"),
      t.type,
      String(t.amount),
      catName.get(t.categoryId) ?? "",
      accName.get(t.accountId) ?? "",
      t.currency,
      t.note ?? "",
    ]
      .map(escape)
      .join(",")
  );
  return [HEADERS.join(","), ...rows].join("\n");
}

/** Trigger a browser download of the export. */
export async function downloadCsv(): Promise<void> {
  const csv = await exportCsv();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `expenses-${dayjs().format("YYYY-MM-DD")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// minimal CSV line parser (handles quoted fields)
function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

export interface ImportResult {
  imported: number;
  skipped: number;
}

/**
 * Import transactions from a CSV string. Matches categories/accounts by name
 * (creating them if missing). Returns counts.
 */
export async function importCsv(text: string): Promise<ImportResult> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (lines.length < 2) return { imported: 0, skipped: 0 };

  const header = parseLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);

  const [categories, accounts] = await Promise.all([
    db.categories.toArray(),
    db.accounts.toArray(),
  ]);
  const catByName = new Map(categories.map((c) => [c.name.toLowerCase(), c]));
  const accByName = new Map(accounts.map((a) => [a.name.toLowerCase(), a]));

  const now = Date.now();
  const newTxs: Transaction[] = [];
  let skipped = 0;

  // collect categories/accounts to create
  const toCreateCats = new Map<string, { name: string; type: "expense" | "income" }>();
  const toCreateAccs = new Map<string, { name: string; currency: string }>();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    const dateStr = cols[idx("date")];
    const amount = Number(cols[idx("amount")]);
    const type = (cols[idx("type")] ?? "expense").trim().toLowerCase();
    if (!dateStr || !Number.isFinite(amount) || amount <= 0 || (type !== "expense" && type !== "income")) {
      skipped++;
      continue;
    }
    const catName = (cols[idx("category")] ?? "Other").trim();
    const accName = (cols[idx("account")] ?? accounts[0]?.name ?? "Cash").trim();
    const currency = (cols[idx("currency")] ?? accounts[0]?.currency ?? "EUR").trim() || "EUR";

    if (!catByName.has(catName.toLowerCase()))
      toCreateCats.set(catName.toLowerCase(), { name: catName, type: type as "expense" | "income" });
    if (!accByName.has(accName.toLowerCase()))
      toCreateAccs.set(accName.toLowerCase(), { name: accName, currency });
  }

  // create missing categories/accounts up front
  await db.transaction("rw", db.categories, db.accounts, async () => {
    let order = categories.length;
    for (const c of toCreateCats.values()) {
      const cat = { id: uid(), name: c.name, icon: "📦", color: "#36893B", type: c.type, order: order++ };
      await db.categories.put(cat);
      catByName.set(c.name.toLowerCase(), cat);
    }
    for (const a of toCreateAccs.values()) {
      const acc = { id: uid(), name: a.name, type: "other" as const, currency: a.currency, openingBalance: 0, createdAt: now };
      await db.accounts.put(acc);
      accByName.set(a.name.toLowerCase(), acc);
    }
  });

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    const dateStr = cols[idx("date")];
    const amount = Number(cols[idx("amount")]);
    const type = (cols[idx("type")] ?? "expense").trim().toLowerCase();
    if (!dateStr || !Number.isFinite(amount) || amount <= 0 || (type !== "expense" && type !== "income")) {
      continue;
    }
    const cat = catByName.get((cols[idx("category")] ?? "Other").trim().toLowerCase());
    const acc = accByName.get((cols[idx("account")] ?? "").trim().toLowerCase()) ?? accounts[0];
    if (!cat || !acc) {
      skipped++;
      continue;
    }
    newTxs.push({
      id: uid(),
      amount,
      type: type as "expense" | "income",
      categoryId: cat.id,
      accountId: acc.id,
      date: dayjs(dateStr).valueOf(),
      note: (cols[idx("note")] ?? "").trim() || undefined,
      currency: (cols[idx("currency")] ?? acc.currency).trim() || acc.currency,
      createdAt: now,
      updatedAt: now,
    });
  }

  if (newTxs.length) await db.transactions.bulkPut(newTxs);
  return { imported: newTxs.length, skipped };
}
