import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Bot, FileText, Settings } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";

const products = [
  {
    id: "taxfix",
    name: "Taxfix",
    tagline: "File your German tax return",
    description:
      "Answer simple questions, scan documents, and submit your return — built for clarity and peace of mind.",
    href: "https://taxfix.de/en/",
    icon: FileText,
    accent: "from-brand-600 to-brand-500",
    chip: "Tax filing",
  },
  {
    id: "steuerbot",
    name: "Steuerbot",
    tagline: "Tax support for freelancers",
    description:
      "Digital tax assistant for self-employed professionals — guidance, checks, and expert help when you need it.",
    href: "https://steuerbot.com/",
    icon: Bot,
    accent: "from-brand-700 to-brand-600",
    chip: "Freelancers",
  },
] as const;

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
          className="rounded-full bg-surface p-2.5 text-brand-600 shadow-card"
        >
          <Settings size={20} />
        </button>
      </header>

      <p className="text-sm leading-relaxed text-muted">
        From tracking spend to filing taxes — discover tools from Taxfix that help you stay on top of your money.
      </p>

      <div className="space-y-4">
        {products.map((p) => (
          <a
            key={p.id}
            href={p.href}
            target="_blank"
            rel="noopener noreferrer"
            className="card group block overflow-hidden p-0 transition active:scale-[0.99]"
          >
            <div className={`bg-gradient-to-br ${p.accent} px-5 py-4 text-white`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                    {p.chip}
                  </span>
                  <h2 className="mt-2 text-xl font-bold">{p.name}</h2>
                  <p className="text-sm text-white/90">{p.tagline}</p>
                </div>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <p.icon size={22} strokeWidth={2} />
                </span>
              </div>
            </div>
            <div className="flex items-end justify-between gap-3 p-4">
              <p className="text-sm leading-relaxed text-muted">{p.description}</p>
              <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-600 group-hover:text-brand-700">
                Open
                <ArrowUpRight size={16} />
              </span>
            </div>
          </a>
        ))}
      </div>

      <section className="card border border-brand-100 bg-brand-50/80 p-4 dark:border-brand-800/40 dark:bg-brand-900/20">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          About this app
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Spend helps you track expenses on your device. When tax season arrives, Taxfix and Steuerbot can help you
          file with confidence.
        </p>
      </section>
    </div>
  );
}
