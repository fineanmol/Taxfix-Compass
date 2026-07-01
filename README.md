# Expense Tracker (Quanto-style PWA)

A privacy-first, **manual** personal expense tracker — inspired by
[Quanto](https://apps.apple.com/us/app/quanto-expense-tracker/id6749017099).
Fast entry, a clean purple UI, charts & analytics. **No bank syncing.** Your data
stays on your device unless you opt into cloud sync.

One codebase runs as a **web app** and installs as a **PWA on iPhone** (and Android/desktop).

## Features

- ⚡ **Fast entry** — numeric keypad + one-tap category quick-pick (center `+` button)
- 📊 **Dashboard** — total balance, spend-by-category donut, recent transactions
- 📈 **Insights** — spending-over-time bar chart, daily transaction lists, week/month/quarter/year
- 🎯 **Budgets** — per-category monthly limits with progress bars + swipe-to-delete
- 🏦 **Accounts** — cash/checking/savings/credit, multi-account, **transfers** between accounts
- 🔁 **Recurring** — daily/weekly/monthly/yearly rules, auto-materialized on open
- 💱 **Multi-currency** — per-account currency, `Intl`-formatted everywhere
- 📤 **CSV import/export** — move data in and out
- 🙈 **Hide balances** — privacy toggle masks all amounts
- 📅 **Custom month start** — align budgets to your payday
- 🔒 **Local-first** — IndexedDB (Dexie); no account required; optional Supabase sync

## Tech stack

React + Vite + TypeScript · Tailwind · Zustand · Dexie (IndexedDB) · Recharts ·
lucide-react · vite-plugin-pwa (Workbox) · Supabase (optional sync).

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build (also generates the service worker)
npm run preview      # serve the production build locally
```

## Install on iPhone (PWA)

1. Open the app's URL in **Safari**.
2. Tap **Share** → **Add to Home Screen**.
3. Launch it from the home-screen icon — it runs fullscreen, offline, and looks like a native app.

### "Triple-tap to open" (iOS Back Tap)

iOS has no triple-tap-to-launch, but you can wire one yourself:

1. **Shortcuts app** → create a shortcut → *Open URL* → your app's URL → name it (e.g. "Expenses").
2. **Settings → Accessibility → Touch → Back Tap → Triple Tap** → choose your shortcut.
3. Now triple-tapping the back of the iPhone opens the tracker instantly.

(This is an OS feature the user enables — the app just needs to be reachable by URL / installed.)

## Offline

The app works fully offline after first load (service worker precaches the shell;
all data lives in IndexedDB). Verify: DevTools → **Network → Offline** → reload → app still works.

## Optional cloud sync (Supabase)

Sync is **off by default** to keep the app private. To enable cross-device sync:

1. Create a Supabase project, then copy `.env.example` → `.env.local` and fill in:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
2. Create the table + row-level security:
   ```sql
   create table transactions (
     id uuid primary key,
     user_id uuid not null references auth.users(id),
     payload jsonb not null,
     updated_at bigint not null
   );
   alter table transactions enable row level security;
   create policy "own rows" on transactions
     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
   ```
3. In the app: **Settings → Cloud sync** → enter your email → magic-link sign-in → **Sync now**.

Sync is last-write-wins per transaction (by `updatedAt`). Local stays the source of
truth while offline; signing in reconciles both directions.

## CSV format

`date,type,amount,category,account,currency,note` — e.g.
`2026-06-30,expense,12.50,Food & Drink,Cash,USD,Lunch`. Unknown categories/accounts
are created on import.

## Privacy

No analytics or tracking SDKs. All financial data is stored locally in your browser
(IndexedDB) and never leaves your device unless you explicitly enable Supabase sync.

> ⚠️ Don't enter real third-party financial data while testing — use sample data.
