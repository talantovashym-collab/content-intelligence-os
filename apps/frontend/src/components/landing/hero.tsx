import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { AnalysisConsole } from './analysis-console';
import { PROOF_POINTS } from './content';
import { Container } from './primitives';

const rise = (ms: number) => ({ animationDelay: `${ms}ms` });

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-20 pt-28 sm:pt-32">
      {/* One warm light source behind the console */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[38%] h-[720px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,179,71,0.16),transparent)] blur-2xl" />
      {/* Timecode ruler */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-16 h-6 opacity-[0.35] [background-image:repeating-linear-gradient(90deg,rgba(255,255,255,0.18)_0_1px,transparent_1px_12px)] [mask-image:linear-gradient(90deg,transparent,black_20%,black_80%,transparent)]" />

      <Container className="relative">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-ivory-faint motion-safe:animate-rise" style={rise(0)}>
          <span className="text-signal">●</span>&nbsp;&nbsp;Content intelligence for video creators
        </p>

        <h1 className="mt-6 font-display text-[clamp(3rem,7.6vw,7rem)] leading-[0.92] tracking-[-0.025em] text-ivory [text-wrap:balance] motion-safe:animate-rise" style={rise(80)}>
          See why a video works<span className="text-signal">.</span>
          <span className="block italic text-ivory-dim">Then make the one that wins.</span>
        </h1>

        <div className="mt-8 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <p className="max-w-[34rem] text-[17px] leading-relaxed text-ivory-dim motion-safe:animate-rise" style={rise(180)}>
            It finds the videos already winning your niche and takes them apart: hooks, pacing, calls to action, tone.
            Every finding points to the second it happened. Then it turns those patterns into your strategy, scripts and tests.
          </p>
          <div className="flex shrink-0 flex-wrap items-center gap-3 motion-safe:animate-rise" style={rise(260)}>
            <Link href="/register"
              className="group inline-flex items-center gap-2 rounded-full bg-signal px-6 py-3.5 text-[15px] font-medium text-ink-950 shadow-[0_10px_40px_-10px_rgba(255,179,71,0.7)] transition-[background-color,transform] hover:bg-signal-soft active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950">
              Start free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a href="#modes"
              className="inline-flex items-center rounded-full border border-white/15 px-6 py-3.5 text-[15px] text-ivory transition-colors hover:border-white/30 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60">
              See how it works
            </a>
          </div>
        </div>

        <div className="mt-12 motion-safe:animate-rise sm:mt-14" style={rise(380)}>
          <AnalysisConsole />
        </div>

        <dl className="mt-14 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-white/[0.07] pt-10 md:grid-cols-4">
          {PROOF_POINTS.map((p) => (
            <div key={p.label}>
              <dt className="sr-only">{p.label}</dt>
              <dd className="text-5xl font-extralight leading-none tracking-[-0.04em] tabular-nums text-ivory">{p.value}</dd>
              <dd className="mt-3 max-w-[16rem] text-sm leading-snug text-ivory-dim">{p.label}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
