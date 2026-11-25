import { cn } from '@/lib/utils';
import { FinalCta, SiteFooter } from '@/components/landing/closing';
import { Evidence } from '@/components/landing/evidence';
import { Hero } from '@/components/landing/hero';
import { Loop } from '@/components/landing/loop';
import { Models } from '@/components/landing/models';
import { Modes } from '@/components/landing/modes';
import { displayFont, monoFont } from '@/components/landing/primitives';
import { SiteNav } from '@/components/landing/site-nav';

// Film grain, as an inline SVG so the page needs no image requests
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/**
 * Public landing page. Sections are independent components fed by
 * components/landing/content.ts; reorder or add sections here.
 */
export default function HomePage() {
  return (
    <div className={cn(displayFont.variable, monoFont.variable, 'relative min-h-screen overflow-x-clip bg-ink-950 text-ivory antialiased selection:bg-signal selection:text-ink-950')}>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] opacity-[0.045] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
      <SiteNav />
      <main>
        <Hero />
        <Modes />
        <Loop />
        <Evidence />
        <Models />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
