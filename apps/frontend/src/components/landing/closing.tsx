import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { NAV_LINKS } from './content';
import { Container, Wordmark } from './primitives';

export function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-white/[0.06] py-28 sm:py-40">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-[-40%] mx-auto h-[600px] max-w-[1000px] rounded-full bg-[radial-gradient(closest-side,rgba(255,179,71,0.18),transparent)] blur-2xl" />
      <Container className="relative text-center">
        <h2 className="mx-auto max-w-[18ch] font-display text-[clamp(2.8rem,7vw,6.2rem)] leading-[0.95] tracking-[-0.02em] text-ivory">
          Your next video, built from the ones <span className="italic text-signal">that already won.</span>
        </h2>
        <p className="mx-auto mt-7 max-w-md text-[16px] leading-relaxed text-ivory-dim">
          Free to start. Bring your own key from any of eleven AI providers; usage goes on your own account.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/register"
            className="group inline-flex items-center gap-2 rounded-full bg-signal px-7 py-4 text-[15px] font-medium text-ink-950 shadow-[0_10px_40px_-10px_rgba(255,179,71,0.7)] transition-[background-color,transform] hover:bg-signal-soft active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950">
            Create your workspace
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link href="/login"
            className="inline-flex items-center rounded-full border border-white/15 px-7 py-4 text-[15px] text-ivory transition-colors hover:border-white/30 hover:bg-white/[0.04]">
            Sign in
          </Link>
        </div>
      </Container>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.06] py-10">
      <Container className="flex flex-col gap-6 text-[13px] text-ivory-faint sm:flex-row sm:items-center sm:justify-between">
        <Wordmark />
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="transition-colors hover:text-ivory">{l.label}</a>
          ))}
          <Link href="/login" className="transition-colors hover:text-ivory">Sign in</Link>
        </nav>
        <p>© {new Date().getFullYear()} Content Intelligence OS</p>
      </Container>
    </footer>
  );
}
