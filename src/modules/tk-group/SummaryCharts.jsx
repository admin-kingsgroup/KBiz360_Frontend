import React from 'react';

// ─── TK GROUP · FE · Control-Tower summary charts (pure SVG) ─────────────────
// Small, self-contained chart primitives for the Control Tower's lens summaries.
// No chart library — hand-drawn SVG so they stay light and match the app palette
// (mirrors tailwind.config.js semantic colors). Geometry is factored into PURE
// helpers (polar / arcPath / linePoints / stackSegments) that are unit-tested
// without a DOM. Every chart is presentational: it takes numbers, draws, no fetch.

// Palette mirrors tailwind.config.js so charts read as part of the same system.
export const SEM = {
  ok: '#16a34a', warn: '#d97706', err: '#dc2626', info: '#2563eb',
  accent: '#c2a04a', track: '#eceef1', ink: '#14161a', mut: '#5b616e', sub: '#9197a3',
};

/** Band a 0–100 score: ≥75 healthy (green) · 60–74 watch (amber) · <60 at-risk (red). */
export function healthBand(v) {
  return v >= 75 ? SEM.ok : v >= 60 ? SEM.warn : SEM.err;
}

// ── pure geometry (tested) ──
/** Point on a top semicircle: frac 0 → left (180°), frac 1 → right (0°). */
export function polar(cx, cy, r, frac) {
  const a = Math.PI * (1 - frac);
  return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
}
/** SVG arc path along the top semicircle from frac f0 → f1 (clockwise). */
export function arcPath(cx, cy, r, f0, f1) {
  const [x0, y0] = polar(cx, cy, r, f0);
  const [x1, y1] = polar(cx, cy, r, f1);
  const large = (f1 - f0) > 0.5 ? 1 : 0;
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}
/** Evenly-spaced points for a line/area over `vals` scaled to a w×h box. */
export function linePoints(vals, w, h, pad = 6, max = 100) {
  const n = vals.length;
  return vals.map((v, i) => [
    pad + (n > 1 ? i * ((w - 2 * pad) / (n - 1)) : 0),
    h - pad - (Math.max(0, v) / (max || 1)) * (h - 2 * pad),
  ]);
}
/** Turn value segments into cumulative %-widths for a 100% stacked bar. */
export function stackSegments(segments) {
  const total = segments.reduce((s, x) => s + (x.value || 0), 0) || 1;
  let x = 0;
  return segments.map((s) => { const w = (s.value || 0) / total * 100; const out = { ...s, x, w }; x += w; return out; });
}

// ── Semi gauge (a single 0–100 score, with risk bands) ──
export function SemiGauge({ value = 0, size = 150, label = 'out of 100' }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const w = size, h = size * 0.62, cx = w / 2, cy = h - 8, r = w * 0.42, sw = Math.max(10, w * 0.09);
  const band = healthBand(v);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} role="img" aria-label={`score ${v} of 100`}>
      <g opacity="0.16" strokeLinecap="round" fill="none" strokeWidth={sw}>
        <path d={arcPath(cx, cy, r, 0, 0.6)} stroke={SEM.err} />
        <path d={arcPath(cx, cy, r, 0.6, 0.75)} stroke={SEM.warn} />
        <path d={arcPath(cx, cy, r, 0.75, 1)} stroke={SEM.ok} />
      </g>
      <path d={arcPath(cx, cy, r, 0, v / 100)} fill="none" stroke={band} strokeWidth={sw} strokeLinecap="round" />
      <text x={cx} y={cy - 12} textAnchor="middle" fontSize={size * 0.19} fontWeight="750" fill={SEM.ink}>{v}</text>
      <text x={cx} y={cy + 2} textAnchor="middle" fontSize={size * 0.065} fill={SEM.sub}>{label}</text>
    </svg>
  );
}

// ── 100% stacked bar (a small N-part split, e.g. not-started / in-progress / awaiting) ──
export function StackedBar({ segments = [], height = 26, showCounts = true }) {
  const segs = stackSegments(segments);
  return (
    <svg viewBox="0 0 100 10" width="100%" height={height} preserveAspectRatio="none" role="img" aria-label="proportion" style={{ borderRadius: 6, overflow: 'hidden' }}>
      <rect x="0" y="0" width="100" height="10" fill={SEM.track} />
      {segs.map((s, i) => (
        <rect key={i} x={s.x} y="0" width={s.w} height="10" fill={s.color} />
      ))}
      {showCounts && segs.filter((s) => s.w > 11).map((s, i) => (
        <text key={`t${i}`} x={s.x + s.w / 2} y="6.6" textAnchor="middle" fontSize="5" fontWeight="700" fill="#fff">{s.value}</text>
      ))}
    </svg>
  );
}

// ── Gate dot-matrix (one dot per gate, colored pass/warn/fail/na) ──
export function GateDots({ pass = 0, warn = 0, fail = 0, na = 0, perRow = 5, dot = 15, gap = 6 }) {
  const cells = [
    ...Array(fail).fill(SEM.err), ...Array(warn).fill(SEM.warn),
    ...Array(pass).fill(SEM.ok), ...Array(na).fill(SEM.track),
  ];
  const n = cells.length || 1;
  const W = perRow * (dot + gap) - gap;
  const H = Math.ceil(n / perRow) * (dot + gap) - gap;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`${pass} pass, ${warn} warn, ${fail} fail`}>
      {cells.map((c, i) => (
        <rect key={i} x={(i % perRow) * (dot + gap)} y={Math.floor(i / perRow) * (dot + gap)} width={dot} height={dot} rx="4" fill={c} />
      ))}
    </svg>
  );
}

// ── Dual line (two series over time, e.g. fixed vs open) ──
export function DualLine({ a = [], b = [], height = 96, max = 100, aColor = SEM.accent, bColor = SEM.err }) {
  const w = 300;
  const toPath = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const pa = linePoints(a, w, height, 8, max);
  const pb = linePoints(b, w, height, 8, max);
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none" role="img" aria-label="trend">
      {pa.length > 0 && <path d={toPath(pa)} fill="none" stroke={aColor} strokeWidth="2.5" />}
      {pb.length > 0 && <path d={toPath(pb)} fill="none" stroke={bColor} strokeWidth="2.5" strokeDasharray="4 3" />}
      {pa.length > 0 && <circle cx={pa[pa.length - 1][0]} cy={pa[pa.length - 1][1]} r="3.4" fill={aColor} />}
    </svg>
  );
}

// ── Mini horizontal bars (a small ranked set, e.g. pending by stream / branch) ──
export function MiniBars({ items = [] }) {
  const max = Math.max(1, ...items.map((i) => i.value || 0));
  return (
    <div className="grid gap-2">
      {items.map((it, i) => (
        <div key={i} className="grid items-center gap-2 text-[11px] text-ink-muted" style={{ gridTemplateColumns: '96px 1fr 26px' }}>
          <span className="truncate">{it.label}</span>
          <span className="h-3 overflow-hidden rounded bg-surface-alt">
            <span className="block h-full" style={{ width: `${(it.value || 0) / max * 100}%`, background: it.color || SEM.accent }} />
          </span>
          <b className="text-right tabular-nums text-ink">{it.value || 0}</b>
        </div>
      ))}
    </div>
  );
}
