'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getToken } from '@/lib/api';
import { NAV_LINKS } from './content';
import { Container, Wordmark } from './primitives';

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(Boolean(getToken()));
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500',
        scrolled || open
          ? 'border-b border-white/[0.07] bg-ink-950/75 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" aria-label="Content Intelligence OS home" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60">
          <Wordmark />
        </Link>

        <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href}
              className="rounded-full px-3.5 py-1.5 text-[13px] text-ivory-dim transition-colors hover:text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {signedIn ? (
            <PrimaryLink href="/dashboard">Open dashboard</PrimaryLink>
          ) : (
            <>
              <Link href="/login" className="rounded-full px-3.5 py-1.5 text-[13px] text-ivory-dim transition-colors hover:text-ivory">
                Sign in
              </Link>
              <PrimaryLink href="/register">Start free</PrimaryLink>
            </>
          )}
        </div>

        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? 'Close menu' : 'Open menu'}
          className="-mr-2 rounded-full p-2 text-ivory md:hidden">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </Container>

      {open && (
        <Container className="pb-6 md:hidden">
          <nav aria-label="Sections" className="flex flex-col border-t border-white/[0.07] pt-4">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-2.5 font-display text-2xl text-ivory">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-5 flex gap-3">
            {signedIn ? (
              <PrimaryLink href="/dashboard">Open dashboard</PrimaryLink>
            ) : (
              <>
                <Link href="/login" className="rounded-full border border-white/15 px-4 py-2 text-sm text-ivory">Sign in</Link>
                <PrimaryLink href="/register">Start free</PrimaryLink>
              </>
            )}
          </div>
        </Container>
      )}
    </header>
  );
}

function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href}
      className="group inline-flex items-center gap-1.5 rounded-full bg-ivory px-4 py-2 text-[13px] font-medium text-ink-950 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950">
      {children}
      <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
    </Link>
  );
}
