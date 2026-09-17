import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Check, Zap, ExternalLink } from "lucide-react";

/**
 * Guided setup for triple-tap quick entry on iPhone.
 *
 * NOTE: a web app cannot create a Shortcut or set a Back Tap binding — iOS
 * exposes no API for either (only Apple's Shortcuts/Settings apps can). So this
 * screen makes the manual setup as fast as possible: copy the quick-add URL,
 * follow the exact taps, and test it.
 */
export default function SetupQuickAdd() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const quickUrl = `${window.location.origin}/quick`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(quickUrl);
    } catch {
      // clipboard blocked (e.g. insecure context) — fall back to select prompt
      window.prompt("Copy this link:", quickUrl);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="safe-top space-y-5 px-4 pt-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface shadow-card"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-2xl font-bold tracking-tight text-content">Triple-tap quick add</h1>
      </div>

      {/* hero */}
      <div className="overflow-hidden rounded-2xl bg-gold-light p-5 text-content shadow-card dark:bg-gold-vivid/15">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white">
          <Zap size={20} />
        </span>
        <p className="mt-3 text-lg font-bold">Add an expense in 2 seconds</p>
        <p className="mt-1 text-sm text-muted">
          Triple-tap the back of your iPhone to jump straight into quick entry — no unlocking,
          no searching for the app.
        </p>
      </div>

      {/* honest note */}
      <p className="rounded-xl bg-surface-2 p-3 text-xs leading-relaxed text-faint">
        iOS only lets <b>you</b> create the Shortcut and set Back&nbsp;Tap — no app (native or web)
        can do it for you. It's a one-time, ~30-second setup. These steps make it quick.
      </p>

      {/* step 1: copy link */}
      <Step n={1} title="Copy your quick-add link">
        <button
          onClick={copyLink}
          className="mt-1 flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 py-3 text-left"
        >
          <span className="min-w-0 flex-1 truncate text-sm text-muted">{quickUrl}</span>
          <span className={`flex items-center gap-1 text-sm font-semibold ${copied ? "text-mint" : "text-brand-600"}`}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copied" : "Copy"}
          </span>
        </button>
      </Step>

      {/* step 2: make the shortcut */}
      <Step n={2} title="Create a Shortcut">
        <ol className="mt-1 space-y-1.5 text-sm text-muted">
          <li>Open the <b className="text-content">Shortcuts</b> app → tap <b className="text-content">+</b> (new shortcut).</li>
          <li>Tap <b className="text-content">Add Action</b> → search <b className="text-content">Open URL</b>.</li>
          <li>Paste your link into the URL field.</li>
          <li>Name it <b className="text-content">"Spend"</b> and save.</li>
        </ol>
      </Step>

      {/* step 3: bind back tap */}
      <Step n={3} title="Bind it to Back Tap">
        <ol className="mt-1 space-y-1.5 text-sm text-muted">
          <li>Open <b className="text-content">Settings</b> → <b className="text-content">Accessibility</b>.</li>
          <li>Tap <b className="text-content">Touch</b> → <b className="text-content">Back Tap</b>.</li>
          <li>Tap <b className="text-content">Triple Tap</b> (or Double Tap).</li>
          <li>Choose your <b className="text-content">"Spend"</b> shortcut.</li>
        </ol>
      </Step>

      {/* step 4: test */}
      <Step n={4} title="Try it">
        <p className="mt-1 text-sm text-muted">
          Triple-tap the back of your phone — or test the screen it opens right here:
        </p>
        <button onClick={() => navigate("/quick")} className="btn-primary mt-2 flex w-full items-center justify-center gap-2">
          <ExternalLink size={18} /> Test quick add
        </button>
      </Step>

      <p className="pb-4 text-center text-xs text-faint">
        Tip: for the best experience, add Spend to your Home Screen first
        (Safari → Share → Add to Home Screen).
      </p>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
          {n}
        </span>
        <h2 className="font-semibold text-content">{title}</h2>
      </div>
      {children}
    </section>
  );
}
