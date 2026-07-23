import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Mountain, Check, ArrowRight, PlayCircle } from "lucide-react";
import { PLATFORM_MODULES, PLATFORM_MODULES_BY_ID } from "@/lib/platform-modules";

export function generateStaticParams() {
  return PLATFORM_MODULES.map((m) => ({ id: m.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const mod = PLATFORM_MODULES_BY_ID[id];
  if (!mod) return { title: "Feature — HimaVolt" };
  return {
    title: `${mod.title} — HimaVolt`,
    description: mod.tagline,
  };
}

export default async function FeatureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const mod = PLATFORM_MODULES_BY_ID[id];
  if (!mod) notFound();

  const Icon = mod.icon;
  const others = PLATFORM_MODULES.filter((m) => m.id !== mod.id).slice(0, 4);

  return (
    <div className="min-h-screen bg-[var(--canvas)] flex flex-col">
      <header className="px-6 py-4 flex justify-between items-center border-b border-[var(--border-soft)]">
        <Link href="/" className="flex items-center gap-2">
          <Mountain className="h-6 w-6 text-[var(--accent)]" strokeWidth={2.5} />
          <span className="text-lg font-black tracking-tight text-[var(--text-1)]">
            Hima<span className="text-[var(--accent)]">Volt</span>
          </span>
        </Link>
        <Link
          href="/features"
          className="text-sm font-bold text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors"
        >
          All features
        </Link>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-6 py-12 md:py-16">
        {/* Hero */}
        <div className="flex flex-col items-center text-center">
          <div
            className={`h-20 w-20 rounded-3xl flex items-center justify-center ${mod.color} shadow-sm ring-4 ring-[var(--surface-alt)] mb-6`}
          >
            <Icon className="h-9 w-9" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-[var(--text-1)] tracking-tight">
            {mod.title}
          </h1>
          <p className="mt-3 text-lg text-[var(--text-2)] font-medium max-w-xl">
            {mod.tagline}
          </p>
        </div>

        {/* Description */}
        <p className="mt-10 text-[15px] md:text-base leading-relaxed text-[var(--text-2)] font-medium">
          {mod.description}
        </p>

        {/* Bullets */}
        <div className="mt-8 rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-alt)] p-6 md:p-8">
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-3)] mb-5">
            What you get
          </h2>
          <ul className="space-y-3.5">
            {mod.bullets.map((b) => (
              <li key={b} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/12 text-[var(--accent)]">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <span className="text-[15px] font-medium text-[var(--text-1)]">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          <Link
            href="/sign-in"
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[var(--accent)] text-white font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-[var(--accent)]/20"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/demo"
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border-soft)] text-[var(--text-1)] font-bold text-sm hover:bg-[var(--surface-alt)] transition-all shadow-sm"
          >
            <PlayCircle className="h-4 w-4" />
            Book a Demo
          </Link>
        </div>

        {/* Explore more */}
        <div className="mt-16">
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-3)] mb-4">
            Explore more
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {others.map((o) => {
              const OIcon = o.icon;
              return (
                <Link
                  key={o.id}
                  href={`/features/${o.id}`}
                  className="group flex flex-col items-center gap-2 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-4 hover:shadow-md transition-all text-center"
                >
                  <span
                    className={`h-11 w-11 rounded-full flex items-center justify-center ${o.color}`}
                  >
                    <OIcon className="h-5 w-5" strokeWidth={1.5} />
                  </span>
                  <span className="text-[11px] font-semibold text-[var(--text-2)] group-hover:text-[var(--text-1)] transition-colors">
                    {o.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
