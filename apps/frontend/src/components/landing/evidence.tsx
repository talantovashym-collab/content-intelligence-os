import { EVIDENCE } from './content';
import { Container, Eyebrow, Section, SectionHeading } from './primitives';

export function Evidence() {
  return (
    <Section id="evidence">
      <Container className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Eyebrow index="03">Evidence</Eyebrow>
          <SectionHeading className="mt-6" title="Receipts," muted="not vibes." />
          <p className="mt-6 max-w-md text-[16px] leading-relaxed text-ivory-dim">
            Every finding names the technique, how sure the model is, and the exact second it comes from.
            Click a timestamp and the video opens right there, so you can check the work yourself.
          </p>
          <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.2em] text-ivory-faint">
            Sample from a real analysis
          </p>
        </div>

        <ol className="relative space-y-4">
          <div aria-hidden className="absolute bottom-6 left-[27px] top-6 w-px bg-gradient-to-b from-signal/60 via-white/10 to-transparent" />
          {EVIDENCE.map((e) => (
            <li key={e.kind} className="relative flex gap-5">
              <span className="relative z-10 mt-5 grid h-[54px] w-[54px] shrink-0 place-items-center rounded-full border border-white/10 bg-ink-900 font-mono text-[12px] tabular-nums text-signal">
                {e.time}
              </span>
              <article className="flex-1 rounded-2xl border border-white/[0.08] bg-ink-900/80 p-5 transition-colors hover:border-white/15 sm:p-6">
                <div className="flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.18em]">
                  <span className="text-signal">{e.kind}</span>
                  <span className="ml-auto tabular-nums text-ivory-faint">confidence {e.confidence.toFixed(2)}</span>
                </div>
                <h3 className="mt-3 font-display text-[1.75rem] leading-tight text-ivory">{e.technique}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ivory-dim">{e.finding}</p>
              </article>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
