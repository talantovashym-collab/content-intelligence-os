import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FALLBACK_ROUTE, PROVIDERS } from './content';
import { Container, Eyebrow, Section, SectionHeading } from './primitives';

export function Models() {
  return (
    <Section id="models">
      <Container>
        <div className="grid gap-14 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
          <div>
            <Eyebrow index="04">Models</Eyebrow>
            <SectionHeading className="mt-6" title="Bring any model." muted="Keep working when one fails." />
            <p className="mt-6 max-w-md text-[16px] leading-relaxed text-ivory-dim">
              Paste your own key from the provider you already pay for. It is encrypted on our side and billed on yours.
              Add a second key and, if the first runs out of credit or gets overloaded, the next one answers instead.
            </p>
            <p className="mt-10 max-w-md text-[15px] leading-[1.9] text-ivory-faint">
              {PROVIDERS.map((p, i) => (
                <span key={p}>
                  <span className="whitespace-nowrap text-ivory/80">
                    {p}
                    {i < PROVIDERS.length - 1 && <span aria-hidden className="text-ivory-faint/60">&nbsp;/</span>}
                  </span>{' '}
                </span>
              ))}
            </p>
          </div>

          {/* One request, routed past two failures */}
          <figure className="relative self-center rounded-[22px] border border-white/[0.09] bg-ink-900 p-6 sm:p-8">
            <div aria-hidden className="pointer-events-none absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-[radial-gradient(closest-side,rgba(255,179,71,0.12),transparent)]" />
            <div className="relative flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.18em] text-ivory-faint">
              <span>Request · draft a creative strategy</span>
              <span className="text-ivory-dim">3 hops</span>
            </div>

            <ol className="relative mt-7">
              <div aria-hidden className="absolute bottom-7 left-[15px] top-7 w-px bg-gradient-to-b from-white/10 via-white/10 to-signal/70" />
              {FALLBACK_ROUTE.map((hop, i) => {
                const ok = hop.status === 'ok';
                return (
                  <li key={hop.provider} className="relative flex items-center gap-5 py-3 motion-safe:animate-rise" style={{ animationDelay: `${i * 160}ms` }}>
                    <span className={cn(
                      'relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border',
                      ok ? 'border-signal bg-signal text-ink-950 shadow-[0_0_24px_rgba(255,179,71,0.55)]' : 'border-white/15 bg-ink-950 text-ivory-faint',
                    )}>
                      {ok ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <X className="h-3.5 w-3.5" />}
                    </span>
                    <div className={cn(
                      'flex flex-1 items-center justify-between gap-4 rounded-xl border px-4 py-3.5',
                      ok ? 'border-signal/30 bg-signal/[0.06]' : 'border-white/[0.06] bg-ink-950/50',
                    )}>
                      <span className={cn('text-[15px]', ok ? 'text-ivory' : 'text-ivory-faint line-through decoration-white/20')}>
                        {hop.provider}
                      </span>
                      <span className={cn('font-mono text-[11px] tabular-nums', ok ? 'text-signal' : 'text-ivory-faint')}>{hop.note}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
            <figcaption className="relative mt-6 border-t border-white/[0.06] pt-5 text-[13px] leading-relaxed text-ivory-faint">
              Modelled on a real test run. You put your keys in order; a key that fails sits out for five minutes so the next request goes straight through.
            </figcaption>
          </figure>
        </div>
      </Container>
    </Section>
  );
}
