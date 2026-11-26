# Round 2: fixes from round 1
Design Quality 8.3 · Originality 7.6 · Craft 8 · Functionality 8.5
→ 0.35*8.3 + 0.30*7.6 + 0.25*8 + 0.10*8.5 = 8.04 (passes 7.5)

- Headline now reads "See why a video works." on one line at 1440; the console's frames and
  findings sit inside the first viewport. Proof numerals switched to light sans.
- Models section shows the fallback itself (two failed hops, the third answers) instead of a
  grid; provider names wrap whole, separators stay attached.
- Mobile (390px): no horizontal overflow, console collapses to 4 frames + stacked findings.

Remaining nits (not blocking): mode tabs' inactive labels are low contrast (large text, ~3.6:1);
entrance animations hold content at opacity 0 until the first frame paints.
Evaluator note: the generator and evaluator were the same agent this run, so treat scores as a
self-review; the browser screenshots are the evidence.
