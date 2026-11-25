/**
 * Everything the landing page says lives here, so adding a mode, module, provider or
 * finding is a data edit. Only claims the product backs up today belong in this file;
 * sample output is paraphrased from a real analysis run, not invented quotes.
 */

export const NAV_LINKS = [
  { label: 'How it works', href: '#modes' },
  { label: 'The loop', href: '#loop' },
  { label: 'Evidence', href: '#evidence' },
  { label: 'Models', href: '#models' },
] as const;

/** The sample analysis shown in the hero console. */
export const HERO_ANALYSIS = {
  title: 'Reference · personal finance tips for students',
  duration: '9:41',
  stats: [
    { label: 'Views', value: '77k' },
    { label: 'Engagement', value: '3.0%' },
    { label: 'Transcript', value: '398 segments' },
  ],
  /** Attention-style curve, 0..1 across the video; drawn as an SVG path. */
  curve: [0.98, 0.9, 0.84, 0.8, 0.77, 0.74, 0.73, 0.7, 0.69, 0.71, 0.66, 0.63, 0.62, 0.6, 0.58, 0.57, 0.55, 0.52],
  /** Findings pinned to the timeline; `at` is the position along the video, 0..1. */
  findings: [
    { kind: 'Hook', time: '0:03', at: 0.04, confidence: 0.95, note: 'Listicle promise paired with nostalgia and future pacing' },
    { kind: 'CTA', time: '0:30', at: 0.12, confidence: 0.94, note: 'The ask lands in the intro, before the first tip' },
    { kind: 'Loop', time: '0:46', at: 0.2, confidence: 0.9, note: 'All five tips teased up front; the payoff is held back' },
    { kind: 'Structure', time: '4:12', at: 0.48, confidence: 0.96, note: 'Numbered sections with conversational transitions' },
  ],
} as const;

export const PROOF_POINTS = [
  { value: '11', label: 'analysis types per video' },
  { value: '0:00', label: 'every finding links to the moment it cites' },
  { value: '11', label: 'AI providers. Bring your own key, with automatic fallback' },
  { value: '1', label: 'workspace from first idea to analytics' },
] as const;

export type ModeId = 'discover' | 'idea' | 'video';

export interface Mode {
  id: ModeId;
  index: string;
  name: string;
  headline: string;
  body: string;
  steps: string[];
  cta: string;
}

export const MODES: Mode[] = [
  {
    id: 'discover',
    index: '01',
    name: 'Discover',
    headline: 'Let the market tell you what to make.',
    body: 'Give it a niche. It searches YouTube, reads what is already winning, and ranks the gaps by demand, saturation and how hard they are to produce.',
    steps: ['Searches real videos in your niche', 'Scores demand, competition and fit', 'Every idea cites the videos behind it'],
    cta: 'Find opportunities',
  },
  {
    id: 'idea',
    index: '02',
    name: 'Validate',
    headline: 'Bring an idea. Get a verdict.',
    body: 'Describe the video you want to make. It checks the idea against what already exists and tells you whether to go, change the angle, or drop it.',
    steps: ['Pulls comparable videos', 'Go, pivot or drop, with reasons', 'Suggests stronger angles'],
    cta: 'Test an idea',
  },
  {
    id: 'video',
    index: '03',
    name: 'Deconstruct',
    headline: 'Paste a video. Get its playbook.',
    body: 'Capture any public video. Its transcript, stats and eleven kinds of analysis land in your library, ready to compare against the rest.',
    steps: ['Paste a URL, nothing to upload', 'Hooks, pacing, CTAs, tone, structure', 'Creative DNA across many references'],
    cta: 'Take a video apart',
  },
];

/** Sample output for each mode's preview panel. */
export const MODE_PREVIEWS: Record<ModeId, { title: string; rows: { label: string; detail: string; score: string }[] }> = {
  discover: {
    title: 'Ranked opportunities · student finance',
    rows: [
      { label: 'The $100 grocery cart, on a whiteboard', detail: 'High demand · few long-form answers', score: '0.77' },
      { label: 'Why 50/30/20 budgets fail students', detail: 'Contrarian angle · 3 references', score: '0.72' },
      { label: 'First paycheck: the 20-minute setup', detail: 'Evergreen · low production cost', score: '0.68' },
    ],
  },
  idea: {
    title: 'Verdict · budgeting for nursing students',
    rows: [
      { label: 'Go, but narrow the audience', detail: 'General budgeting is crowded; shift-work pay is not', score: 'GO' },
      { label: 'Stronger angle', detail: 'Budget around 12-hour shifts and irregular overtime', score: '+1' },
      { label: 'Evidence', detail: 'Comparable videos pulled from search, with stats', score: 'REF' },
    ],
  },
  video: {
    title: 'Library · 2 references indexed',
    rows: [
      { label: 'Personal finance tips for students', detail: '398 transcript segments · 6 analyses', score: '77k' },
      { label: 'Saving and budgeting for beginners', detail: '494 transcript segments · indexed', score: '302k' },
      { label: 'Shared creative DNA', detail: 'Promise the list early, pay it off late', score: 'DNA' },
    ],
  },
};

/** The modules, grouped into the four phases of the loop. */
export const PHASES = [
  { name: 'Discover', summary: 'Find what is worth making.', modules: ['Opportunity discovery', 'Idea validation'] },
  {
    name: 'Understand',
    summary: 'Learn why the winners win.',
    modules: ['Reference research', 'Reference library', 'Investigation studio', 'Multi-reference intelligence'],
  },
  { name: 'Make', summary: 'Turn patterns into a plan.', modules: ['Creative strategy', 'Production studio', 'Testing lab'] },
  { name: 'Learn', summary: 'Measure it, then feed it back.', modules: ['Publishing center', 'Performance analytics', 'Knowledge base'] },
] as const;

/** Sample investigation findings (paraphrased from a real run). */
export const EVIDENCE = [
  {
    kind: 'Hook',
    time: '0:03',
    confidence: 0.95,
    technique: 'Listicle hook with nostalgia',
    finding: 'The opening promises a fixed number of lessons and frames them as hindsight, so the viewer knows the payoff and why it matters.',
  },
  {
    kind: 'Curiosity loop',
    time: '0:46',
    confidence: 0.9,
    technique: 'Tease the whole framework',
    finding: 'All five points are named up front and the most valuable one is held for last, which keeps people past the midpoint.',
  },
  {
    kind: 'Tone',
    time: '2:18',
    confidence: 0.93,
    technique: 'Peer, not advisor',
    finding: 'Informal, reassuring and direct. Advice is framed as shared experience rather than instruction.',
  },
] as const;

export const PROVIDERS = [
  'OpenAI',
  'Anthropic',
  'Google Gemini',
  'Mistral',
  'Groq',
  'DeepSeek',
  'OpenRouter',
  'NVIDIA NIM',
  'Vercel AI Gateway',
  'TeamoRouter',
  'Token Harbor',
] as const;

/** Modelled on a real test run: two providers failed, the third answered. */
export const FALLBACK_ROUTE = [
  { provider: 'DeepSeek', status: 'fail', note: 'Out of credit · skipped for 5 min' },
  { provider: 'Google Gemini', status: 'fail', note: 'Timed out · moved on' },
  { provider: 'OpenRouter', status: 'ok', note: 'Answered in 2.5s' },
] as const;
