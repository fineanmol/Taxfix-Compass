import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Bot, FileText, Settings } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";

export default function Explore() {
  const navigate = useNavigate();

  return (
    <div className="safe-top space-y-5 px-4 pt-4 pb-6">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <AppLogo className="h-11 w-11 rounded-xl shadow-card" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-content">Explore</h1>
            <p className="text-sm text-muted">Taxfix products for your finances</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("/settings")}
          aria-label="App settings"
          className="rounded-full bg-surface p-2.5 text-content shadow-card"
        >
          <Settings size={20} />
        </button>
      </header>

      <p className="text-sm leading-relaxed text-muted">
        From tracking spend to filing taxes — discover tools from Taxfix that help you stay on top of your money.
      </p>

      <div className="space-y-4">
        <a
          href="https://taxfix.de/en/"
          target="_blank"
          rel="noopener noreferrer"
          className="card group flex overflow-hidden p-0 transition active:scale-[0.99]"
        >
          <span className="w-1.5 shrink-0 bg-gold-vivid" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3 bg-gold-light px-5 py-4 dark:bg-gold-vivid/15">
              <div>
                <span className="inline-block rounded-full bg-gold-vivid px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink">
                  Tax filing
                </span>
                <h2 className="mt-2 text-xl font-bold text-content">Taxfix</h2>
                <p className="text-sm text-muted">File your German tax return</p>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white">
                <FileText size={22} strokeWidth={2} />
              </span>
            </div>
            <div className="flex items-end justify-between gap-3 p-4">
              <p className="text-sm leading-relaxed text-muted">
                Answer simple questions, scan documents, and submit your return — built for clarity and peace of mind.
              </p>
              <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-600 group-hover:text-brand-700">
                Open
                <ArrowUpRight size={16} />
              </span>
            </div>
          </div>
        </a>

        <a
          href="https://steuerbot.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="card group flex overflow-hidden p-0 transition active:scale-[0.99]"
        >
          <span className="w-1.5 shrink-0 bg-blue-vivid" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3 bg-blue-light px-5 py-4 dark:bg-blue-vivid/15">
              <div>
                <span className="inline-block rounded-full bg-lilac-vivid px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                  Freelancers
                </span>
                <h2 className="mt-2 text-xl font-bold text-content">Steuerbot</h2>
                <p className="text-sm text-muted">Tax support for freelancers</p>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-vivid text-white">
                <Bot size={22} strokeWidth={2} />
              </span>
            </div>
            <div className="flex items-end justify-between gap-3 p-4">
              <p className="text-sm leading-relaxed text-muted">
                Digital tax assistant for self-employed professionals — guidance, checks, and expert help when you need
                it.
              </p>
              <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-blue-vivid group-hover:text-blue-calm">
                Open
                <ArrowUpRight size={16} />
              </span>
            </div>
          </div>
        </a>
      </div>

      <section className="card border border-lilac-calm/40 bg-lilac-light p-4 dark:border-lilac-vivid/30 dark:bg-lilac-vivid/10">
        <p className="text-xs font-semibold uppercase tracking-wide text-lilac-vivid">About this app</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Spend helps you track expenses on your device. When tax season arrives, Taxfix and Steuerbot can help you
          file with confidence.
        </p>
      </section>
    </div>
  );
}
