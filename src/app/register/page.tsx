import Link from "next/link";
import { Mountain, Rocket } from "lucide-react";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] flex flex-col">
      <header className="px-6 py-4 flex justify-between items-center border-b border-[var(--border-soft)]">
        <Link href="/" className="flex items-center gap-2">
          <Mountain className="h-6 w-6 text-[var(--accent)]" strokeWidth={2.5} />
          <span className="text-lg font-black tracking-tight text-[var(--text-1)]">
            Hima<span className="text-[var(--accent)]">Volt</span>
          </span>
        </Link>
        <Link href="/sign-in" className="text-sm font-bold text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors">
          Log in instead
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-[var(--surface-alt)] rounded-2xl flex items-center justify-center mb-8 border border-[var(--border-soft)] shadow-inner">
            <Rocket className="h-8 w-8 text-[var(--accent)]" />
          </div>
          <h1 className="text-3xl font-black text-[var(--text-1)] tracking-tight">Create your account</h1>
          <p className="text-[var(--text-2)] font-medium">
            Self-service registration is currently invite-only while we scale. Please contact our team or request a demo to get early access.
          </p>
          <div className="pt-4 flex flex-col gap-3">
            <Link href="/demo" className="w-full py-3.5 rounded-xl bg-[var(--accent)] text-white font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-[var(--accent)]/20">
              Request a Demo
            </Link>
            <Link href="/contact" className="w-full py-3.5 rounded-xl bg-white border border-[var(--border-soft)] text-[var(--text-1)] font-bold text-sm hover:bg-[var(--surface-alt)] transition-all shadow-sm">
              Contact Sales
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
