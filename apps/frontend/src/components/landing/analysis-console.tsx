import { HERO_ANALYSIS } from './content';

const W = 600;
const H = 150;

/** Smooth path through the curve points (Catmull-Rom → cubic Bézier). */
function curvePath(points: readonly number[]) {
  const xy = points.map((v, i) => [(i / (points.length - 1)) * W, 12 + (1 - v) * (H - 24) * 1.6] as const);
  let d = `M ${xy[0][0]} ${xy[0][1]}`;
  for (let i = 0; i < xy.length - 1; i++) {
    const [x0, y0] = xy[Math.max(0, i - 1)];
    const [x1, y1] = xy[i];
    const [x2, y2] = xy[i + 1];
    const [x3, y3] = xy[Math.min(xy.length - 1, i + 2)];
    d += ` C ${x1 + (x2 - x0) / 6} ${y1 + (y2 - y0) / 6}, ${x2 - (x3 - x1) / 6} ${y2 - (y3 - y1) / 6}, ${x2} ${y2}`;
  }
  return { d, xy };
}

function yAt(xy: readonly (readonly [number, number])[], at: number) {
  const pos = at * (xy.length - 1);
  const i = Math.min(xy.length - 2, Math.floor(pos));
  return xy[i][1] + (xy[i + 1][1] - xy[i][1]) * (pos - i);
}

/** Abstract "stills" of a talking-head video: faces, title cards and b-roll. */
const FRAMES: { kind: 'face' | 'title' | 'broll'; hue: number; label?: string; t: string }[] = [
  { kind: 'face', hue: 28, t: '0:00' },
  { kind: 'title', hue: 38, label: '5 TIPS', t: '0:03' },
  { kind: 'face', hue: 210, t: '0:30' },
  { kind: 'broll', hue: 160, t: '0:46' },
  { kind: 'title', hue: 38, label: 'TIP 1', t: '1:02' },
  { kind: 'face', hue: 24, t: '2:18' },
  { kind: 'broll', hue: 260, t: '3:40' },
  { kind: 'face', hue: 200, t: '4:12' },
];

function Still({ kind, hue, label }: (typeof FRAMES)[number]) {
  const base = `radial-gradient(120% 90% at 30% 10%, hsl(${hue} 35% 22%), hsl(${hue} 30% 8%) 70%)`;
  return (
    <div className="relative aspect-video overflow-hidden rounded-[6px] ring-1 ring-inset ring-white/[0.07]" style={{ background: base }}>
      {kind === 'face' && (
        <>
          <div className="absolute left-1/2 top-[30%] h-[34%] w-[22%] -translate-x-1/2 rounded-full" style={{ background: `hsl(${hue} 30% 62% / 0.55)` }} />
          <div className="absolute bottom-[-30%] left-1/2 h-[62%] w-[64%] -translate-x-1/2 rounded-[50%]" style={{ background: `hsl(${hue} 25% 40% / 0.5)` }} />
        </>
      )}
      {kind === 'title' && (
        <span className="absolute inset-0 grid place-items-center font-display text-[15px] italic tracking-tight text-signal-soft/90">{label}</span>
      )}
      {kind === 'broll' && (
        <div className="absolute inset-x-[12%] bottom-[18%] top-[34%] rounded-sm"
          style={{ background: `linear-gradient(90deg, hsl(${hue} 30% 45% / .5), hsl(${hue} 30% 25% / .3))` }} />
      )}
    </div>
  );
}

export function AnalysisConsole() {
  const { d, xy } = curvePath(HERO_ANALYSIS.curve);
  return (
    <div className="relative overflow-hidden rounded-[22px] border border-white/[0.09] bg-ink-900/90 shadow-[0_50px_140px_-40px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur">
      {/* Title bar */}
      <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-3 font-mono text-[11px] text-ivory-faint">
        <span className="flex items-center gap-2 text-signal">
          <span className="h-1.5 w-1.5 rounded-full bg-signal motion-safe:animate-blink" />
          ANALYZING
        </span>
        <span className="truncate text-ivory-dim">{HERO_ANALYSIS.title}</span>
        <span className="ml-auto hidden sm:inline">{HERO_ANALYSIS.duration}</span>
      </div>

      <div className="grid lg:grid-cols-[1.5fr_1fr]">
        {/* Left: frames + curve */}
        <div className="border-white/[0.07] p-5 lg:border-r">
          <div className="relative">
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
              {FRAMES.map((f, i) => (
                <div key={i} className={i >= 4 ? 'hidden sm:block' : undefined}>
                  <Still {...f} />
                  <p className="mt-1.5 font-mono text-[9.5px] text-ivory-faint">{f.t}</p>
                </div>
              ))}
            </div>
            {/* Scan head sweeping the frames */}
            <div aria-hidden className="pointer-events-none absolute inset-y-[-4px] left-0 w-[10%] motion-safe:animate-scan">
              <div className="mx-auto h-full w-px bg-signal shadow-[0_0_18px_3px_rgba(255,179,71,0.55)]" />
            </div>
          </div>

          <div className="mt-6 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-ivory-faint">
            <span>Attention</span>
            <span>Findings pinned to time</span>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-auto w-full overflow-visible" role="img" aria-label="Attention curve with findings marked at their timestamps">
            <defs>
              <linearGradient id="hero-area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#ffb347" stopOpacity="0.22" />
                <stop offset="1" stopColor="#ffb347" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map((g) => (
              <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke="rgba(255,255,255,0.05)" />
            ))}
            <path d={`${d} L ${W} ${H} L 0 ${H} Z`} fill="url(#hero-area)" />
            <path d={d} fill="none" stroke="#f2ede3" strokeOpacity="0.85" strokeWidth="1.6" pathLength={1}
              strokeDasharray="1" className="motion-safe:animate-draw" />
            {HERO_ANALYSIS.findings.map((f) => {
              const x = f.at * W;
              const y = yAt(xy, f.at);
              return (
                <g key={f.kind}>
                  <line x1={x} x2={x} y1={y} y2={H} stroke="#ffb347" strokeOpacity="0.35" strokeDasharray="2 3" />
                  <circle cx={x} cy={y} r="7" fill="#ffb347" fillOpacity="0.15" />
                  <circle cx={x} cy={y} r="3" fill="#ffb347" />
                </g>
              );
            })}
          </svg>

          <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-white/[0.07] pt-4">
            {HERO_ANALYSIS.stats.map((s) => (
              <div key={s.label}>
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-ivory-faint">{s.label}</dt>
                <dd className="mt-1 text-lg tabular-nums text-ivory">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Right: findings */}
        <ol className="divide-y divide-white/[0.06] border-t border-white/[0.07] lg:border-t-0">
          {HERO_ANALYSIS.findings.map((f, i) => (
            <li key={f.kind} className="px-5 py-4 motion-safe:animate-rise" style={{ animationDelay: `${900 + i * 140}ms` }}>
              <div className="flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-[0.16em]">
                <span className="text-signal">{f.kind}</span>
                <span className="rounded border border-white/10 px-1.5 py-px text-ivory-dim">{f.time}</span>
                <span className="ml-auto tabular-nums text-ivory-faint">{f.confidence.toFixed(2)}</span>
              </div>
              <p className="mt-2 text-[13.5px] leading-snug text-ivory/90">{f.note}</p>
              <div className="mt-2.5 h-px w-full bg-white/[0.06]">
                <div className="h-px bg-gradient-to-r from-signal/80 to-signal/20" style={{ width: `${f.confidence * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
