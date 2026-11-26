import { Instrument_Serif, JetBrains_Mono } from 'next/font/google';
import { cn } from '@/lib/utils';

/** Editorial serif for headlines, mono for data labels. Scoped to the landing page. */
export const displayFont = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--font-display' });
export const monoFont = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono' });

/** Page-width wrapper shared by every landing section. */
export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('mx-auto w-full max-w-[1200px] px-5 sm:px-8', className)}>{children}</div>;
}

/** Small mono label above a section heading: "02 — The loop". */
export function Eyebrow({ index, children, className }: { index?: string; children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-ivory-faint', className)}>
      {index && <span className="text-signal">{index}</span>}
      {index && <span aria-hidden className="h-px w-6 bg-ivory/20" />}
      {children}
    </p>
  );
}

/** Section heading: serif headline, optional muted italic second line. */
export function SectionHeading({ title, muted, className }: { title: string; muted?: string; className?: string }) {
  return (
    <h2 className={cn('font-display text-[2.6rem] leading-[1.02] tracking-[-0.01em] text-ivory [text-wrap:balance] sm:text-6xl', className)}>
      {title}
      {muted && <span className="block italic text-ivory-dim [text-wrap:balance]">{muted}</span>}
    </h2>
  );
}

/** Section shell: consistent vertical rhythm, hairline top rule, anchor id. */
export function Section({ id, className, children }: { id?: string; className?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={cn('relative scroll-mt-20 border-t border-white/[0.06] py-24 sm:py-32', className)}>
      {children}
    </section>
  );
}

/** Logo mark: three timeline bars and a signal dot, i.e. a video being read. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden className={cn('h-7 w-7', className)}>
      <rect x="0.5" y="0.5" width="27" height="27" rx="7.5" fill="#111116" stroke="rgba(255,255,255,0.12)" />
      <rect x="7" y="8.5" width="14" height="2" rx="1" fill="#f2ede3" />
      <rect x="7" y="13" width="9" height="2" rx="1" fill="#f2ede3" opacity="0.6" />
      <rect x="7" y="17.5" width="5" height="2" rx="1" fill="#f2ede3" opacity="0.35" />
      <circle cx="19.5" cy="18.5" r="2.25" fill="#ffb347" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-[15px] font-medium tracking-tight text-ivory">
        Content Intelligence <span className="text-ivory-faint">OS</span>
      </span>
    </span>
  );
}
