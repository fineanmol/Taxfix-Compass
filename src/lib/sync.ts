import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { db } from "@/db/db";
import type { Transaction } from "@/db/types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True only when the user has configured Supabase. Sync UI hides itself otherwise. */
export const syncConfigured = Boolean(url && anon);

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient | null {
  if (!syncConfigured) return null;
  if (!client) client = createClient(url!, anon!);
  return client;
}

/**
 * Last-write-wins push/pull of transactions for the signed-in user.
 *
 * Server table expected:
 *   transactions(id uuid pk, user_id uuid, payload jsonb, updated_at bigint)
 * with RLS limiting rows to auth.uid(). Local stays the source of truth while
 * offline; this reconciles when online + signed in.
 */
export async function syncTransactions(userId: string): Promise<{ pushed: number; pulled: number }> {
  const sb = supabase();
  if (!sb) return { pushed: 0, pulled: 0 };

  const local = await db.transactions.toArray();

  // pull remote
  const { data: remoteRows, error } = await sb
    .from("transactions")
    .select("id, payload, updated_at")
    .eq("user_id", userId);
  if (error) throw error;

  const remote = new Map<string, { tx: Transaction; updated_at: number }>(
    (remoteRows ?? []).map((r) => [r.id as string, { tx: r.payload as Transaction, updated_at: r.updated_at as number }])
  );
  const localMap = new Map(local.map((t) => [t.id, t]));

  // pull: remote newer than local (or missing locally)
  let pulled = 0;
  const toPutLocal: Transaction[] = [];
  for (const [id, r] of remote) {
    const l = localMap.get(id);
    if (!l || r.updated_at > l.updatedAt) {
      toPutLocal.push(r.tx);
      pulled++;
    }
  }
  if (toPutLocal.length) await db.transactions.bulkPut(toPutLocal);

  // push: local newer than remote (or missing remotely)
  const toPushRemote = local.filter((l) => {
    const r = remote.get(l.id);
    return !r || l.updatedAt > r.updated_at;
  });
  if (toPushRemote.length) {
    const rows = toPushRemote.map((t) => ({
      id: t.id,
      user_id: userId,
      payload: t,
      updated_at: t.updatedAt,
    }));
    const { error: upErr } = await sb.from("transactions").upsert(rows);
    if (upErr) throw upErr;
  }

  return { pushed: toPushRemote.length, pulled };
}
