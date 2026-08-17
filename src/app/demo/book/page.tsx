import Link from "next/link";
import { Mountain, Presentation, PlayCircle } from "lucide-react";

/**
 * Book a live demo.
 *
 * This used to live at `/demo`. That route now holds the self-serve video
 * walkthroughs, so the lead-generation page moved here and the "Book a Demo"
 * CTAs on the landing page and feature pages were repointed. Both paths are
 * still reachable and cross-link to each other.
 */
export default function BookDemoPage() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] flex flex-col">
      <header className="px-6 py-4 flex justify-between items-center border-b border-[var(--border-soft)]">
        <Link href="/" className="flex items-center gap-2">
          <Mountain className="h-6 w-6 text-[var(--accent)]" strokeWidth={2.5} />
          <span className="text-lg font-black tracking-tight text-[var(--text-1)]">
            Hima<span className="text-[var(--accent)]">Volt</span>
          </span>
        </Link>
        <Link href="/" className="text-sm font-bold text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors">
          Back to home
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-[var(--surface-alt)] rounded-2xl flex items-center justify-center mb-8 border border-[var(--border-soft)] shadow-inner">
            <Presentation className="h-8 w-8 text-[var(--accent)]" />
          </div>
          <h1 className="text-3xl font-black text-[var(--text-1)] tracking-tight">Book a Demo</h1>
          <p className="text-[var(--text-2)] font-medium">
            See how HimaVolt can transform your restaurant or hotel operations. Our team will walk you through a live, customized demo.
          </p>
          <div className="pt-4 flex flex-col gap-3">
            <Link href="/contact" className="w-full py-3.5 rounded-xl bg-[var(--accent)] text-white font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-[var(--accent)]/20">
              Schedule via Contact
            </Link>
            <Link
              href="/demo"
              className="w-full py-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border-soft)] text-[var(--text-1)] font-bold text-sm hover:bg-[var(--surface-alt)] transition-all flex items-center justify-center gap-2"
            >
              <PlayCircle className="h-4 w-4 text-[var(--accent)]" />
              Or watch the videos now
            </Link>
          </div>
          <p className="text-xs text-[var(--text-3)]">
            No waiting — the video walkthroughs cover setup, the POS and
            payments end to end.
          </p>
        </div>
      </main>
    </div>
  );
}
