'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MODES, MODE_PREVIEWS, type ModeId } from './content';
import { Container, Eyebrow, Section, SectionHeading } from './primitives';

export function Modes() {
  const [active, setActive] = useState<ModeId>(MODES[0].id);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const mode = MODES.find((m) => m.id === active)!;
  const preview = MODE_PREVIEWS[active];

  // Arrow keys move between tabs (WAI-ARIA tabs pattern)
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + MODES.length) % MODES.length;
    setActive(MODES[next].id);
    tabs.current[next]?.focus();
  };

  return (
    <Section id="modes">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
          <div>
            <Eyebrow index="01">Three ways in</Eyebrow>
            <SectionHeading className="mt-6" title="Start anywhere." muted="End with a plan." />
            <p className="mt-6 max-w-md text-[16px] leading-relaxed text-ivory-dim">
              Some days you have a niche, some days an idea, some days a video you cannot stop thinking about.
              Each one feeds the same pipeline.
            </p>

            <div role="tablist" aria-label="Ways to start" className="mt-10 divide-y divide-white/[0.07] border-y border-white/[0.07]">
              {MODES.map((m, i) => {
                const selected = m.id === active;
                return (
                  <button key={m.id} ref={(el) => { tabs.current[i] = el; }} role="tab" type="button"
                    id={`mode-tab-${m.id}`} aria-selected={selected} aria-controls="mode-panel" tabIndex={selected ? 0 : -1}
                    onClick={() => setActive(m.id)} onKeyDown={(e) => onKey(e, i)}
                    className="group flex w-full items-baseline gap-5 py-5 text-left focus-visible:outline-none">
                    <span className={cn('font-mono text-xs transition-colors', selected ? 'text-signal' : 'text-ivory-faint')}>{m.index}</span>
                    <span className={cn(
                      'font-display text-3xl transition-colors sm:text-4xl',
                      selected ? 'text-ivory' : 'text-ivory-faint group-hover:text-ivory-dim group-focus-visible:text-ivory-dim',
                    )}>
                      {m.name}
                    </span>
                    <span className={cn('ml-auto hidden text-sm transition-opacity sm:block', selected ? 'text-ivory-dim opacity-100' : 'opacity-0')}>
                      {m.headline}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div id="mode-panel" role="tabpanel" aria-labelledby={`mode-tab-${active}`}
            className="relative self-start overflow-hidden rounded-[22px] border border-white/[0.09] bg-ink-900 p-6 sm:p-8 lg:mt-14">
            <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(closest-side,rgba(255,179,71,0.14),transparent)]" />
            <div key={active} className="relative motion-safe:animate-rise">
              <h3 className="font-display text-3xl leading-tight text-ivory sm:text-[2.1rem]">{mode.headline}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-ivory-dim">{mode.body}</p>
              <ul className="mt-6 grid gap-2.5 sm:grid-cols-3">
                {mode.steps.map((s) => (
                  <li key={s} className="flex gap-2 text-[13px] leading-snug text-ivory/85">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal" />
                    {s}
                  </li>
                ))}
              </ul>

              <div className="mt-8 rounded-2xl border border-white/[0.07] bg-ink-950/60">
                <p className="border-b border-white/[0.06] px-4 py-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ivory-faint">
                  {preview.title}
                </p>
                <ul className="divide-y divide-white/[0.05]">
                  {preview.rows.map((r) => (
                    <li key={r.label} className="flex items-center gap-4 px-4 py-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] text-ivory">{r.label}</p>
                        <p className="mt-0.5 truncate text-[12.5px] text-ivory-faint">{r.detail}</p>
                      </div>
                      <span className="shrink-0 rounded-md border border-signal/25 bg-signal/[0.08] px-2 py-1 font-mono text-[11px] tabular-nums text-signal">
                        {r.score}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link href="/register"
                className="group mt-7 inline-flex items-center gap-2 text-[14px] font-medium text-ivory transition-colors hover:text-signal">
                {mode.cta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
