# Brief: premium, scalable first page

User brief (verbatim): "look taste improve design make it more and more premium and scaleable first page"

Target: `apps/frontend/src/app/page.tsx` (the public landing page at `/`).

## Interpretation
- **Premium**: feels like a top-tier product (Linear / Vercel / A24-grade craft), not a template.
  One committed art direction, restrained palette, editorial typography, real product imagery.
- **Scalable**: the page is assembled from data-driven section components
  (`src/components/landing/*`), so adding a module, mode, provider or section is a data edit,
  not a markup rewrite. Server components by default; client code only where interactive.
- **Honest**: only claims the product can back up today (YouTube search/capture, timestamped
  evidence, 11 analysis types, provider fallback). No fake logos, testimonials, user counts,
  or dead footer links.

## Direction (decided before building, per the taste skill's "decide first" rule)
"Film-lab editorial": near-black ink, warm ivory type, ONE signal accent (amber), serif display
headlines over a precise sans + mono for data. The hero is the product itself: a console that
reverse-engineers a video (frames, retention curve, timestamped findings) with a slow scan line.

## Constraints
- Next.js 14 App Router, Tailwind, lucide-react; no new heavy dependencies.
- Respect prefers-reduced-motion. Responsive from 360px to 1600px. Accessible contrast (AA).
- Links go to real routes only: /register, /login, /dashboard, in-page anchors.
