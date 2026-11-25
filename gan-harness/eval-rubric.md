# Design evaluation rubric (pass threshold 7.5 weighted)

Score each 1-10 from screenshots (desktop 1440, mobile 390) plus a code read.

### Design Quality (weight: 0.35)
Coherent art direction, hierarchy, typography pairing, spacing rhythm, color discipline
(one accent), first-viewport impact. 10 = award-level; 5 = competent template.

### Originality (weight: 0.30)
Would anyone mistake it for a stock SaaS template? Does the hero show the product's
actual idea (taking a video apart) in a memorable way? Custom visuals over icon grids.

### Craft (weight: 0.25)
Pixel details: alignment, consistent radii, borders, optical sizes, hover/focus states,
motion quality and restraint, mobile layout, no overflow, contrast, reduced-motion.

### Functionality (weight: 0.10)
All links work, interactive bits work, no console errors, builds and type-checks,
sections are data-driven and easy to extend.

Score = 0.35*DQ + 0.30*O + 0.25*C + 0.10*F. Each round records scores and the
top 3 fixes in `gan-harness/feedback/round-N.md`.
