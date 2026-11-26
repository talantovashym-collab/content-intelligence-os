import { PHASES } from './content';
import { Container, Eyebrow, Section, SectionHeading } from './primitives';

export function Loop() {
  // Running module numbers across phases: 01, 02 … 12
  let n = 0;
  return (
    <Section id="loop">
      <Container>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <Eyebrow index="02">The loop</Eyebrow>
            <SectionHeading className="mt-6" title="One workspace." muted="Every step of the video." />
          </div>
          <p className="max-w-sm text-[15px] leading-relaxed text-ivory-dim">
            Twelve modules share one memory. What you learn from a published video shapes the next thing you make.
          </p>
        </div>

        <div className="relative mt-16">
          {/* Track with a node per phase (desktop) */}
          <div aria-hidden className="absolute left-0 right-0 top-[7px] hidden h-px bg-gradient-to-r from-signal/70 via-white/15 to-white/15 lg:block" />
          <ol className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {PHASES.map((phase, i) => (
              <li key={phase.name} className="relative">
                <span aria-hidden className={`hidden h-[15px] w-[15px] rounded-full border lg:block ${i === 0 ? 'border-signal bg-signal shadow-[0_0_20px_rgba(255,179,71,0.6)]' : 'border-white/25 bg-ink-950'}`} />
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ivory-faint lg:mt-7">Phase {i + 1}</p>
                <h3 className="mt-2 font-display text-4xl text-ivory">{phase.name}</h3>
                <p className="mt-2 text-[14px] text-ivory-dim">{phase.summary}</p>
                <ul className="mt-6 space-y-px">
                  {phase.modules.map((m) => {
                    n += 1;
                    return (
                      <li key={m} className="flex items-baseline gap-3 border-t border-white/[0.06] py-2.5 text-[14px] text-ivory/85">
                        <span className="font-mono text-[10.5px] tabular-nums text-ivory-faint">{String(n).padStart(2, '0')}</span>
                        {m}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>

          {/* The return path: learnings feed the next discovery */}
          <div className="mt-12 flex items-center gap-4">
            <svg aria-hidden viewBox="0 0 120 24" className="h-6 w-28 shrink-0 text-signal">
              <path d="M118 4 H24 a10 10 0 0 0 -10 10 v0" fill="none" stroke="currentColor" strokeWidth="1.25" strokeDasharray="3 4" />
              <path d="M8 10 l6 7 6-7" fill="none" stroke="currentColor" strokeWidth="1.25" />
            </svg>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ivory-dim">
              Learnings flow back into discovery
            </p>
          </div>
        </div>
      </Container>
    </Section>
  );
}
