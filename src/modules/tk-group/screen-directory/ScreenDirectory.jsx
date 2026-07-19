/* ════════════════════════════════════════════════════════════════════════════
   SCREEN DIRECTORY  ·  Control Panel ▸ Screen Directory  (Owner / Super Admin)
   Every screen the app can render (from the stable screen-number registry), with
   a LIVE preview: click a row and the real screen loads in a same-origin iframe
   (chrome stripped via ?embed=1) — always current, clickable, zero upkeep.
   Search by name / route / #number (paste a number from a support report to jump).
   ════════════════════════════════════════════════════════════════════════════ */
import React, { useMemo, useRef, useState } from 'react';
import { Copy, ExternalLink, Monitor, Tablet, Smartphone, Search } from 'lucide-react';
import { toastSuccess } from '../../../core/ux/toast';
import { buildIssueToken } from '../../../core/screenNumber';
import { getScreenCatalog } from './screenCatalog';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'menu', label: 'In menu' },
  { key: 'standalone', label: 'Standalone' },
  { key: 'india', label: 'India' },
  { key: 'africa', label: 'Africa' },
  { key: 'group', label: 'Group' },
  { key: 'retired', label: 'Retired' },
];

const DEVICES = [
  { key: 'desktop', label: 'Desktop', icon: Monitor, width: '100%' },
  { key: 'tablet', label: 'Tablet', icon: Tablet, width: 834 },
  { key: 'mobile', label: 'Mobile', icon: Smartphone, width: 390 },
];

const SURFACE_CHIP = {
  india: 'bg-amber-100 text-amber-800',
  africa: 'bg-emerald-100 text-emerald-800',
  group: 'bg-violet-100 text-violet-800',
};

async function copyText(text) {
  try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; } } catch { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy'); document.body.removeChild(ta); return ok;
  } catch { return false; }
}

export function ScreenDirectory() {
  const rows = useMemo(() => getScreenCatalog(), []);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [sel, setSel] = useState(null);       // selected route
  const [device, setDevice] = useState('desktop');
  const listRef = useRef(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const numOnly = /^#?\d+$/.test(term) ? term.replace('#', '') : null;
    return rows.filter((r) => {
      if (filter === 'retired') { if (!r.retired) return false; }
      else if (r.retired) return false; // retired hidden unless explicitly filtered
      if (filter === 'menu' && !r.inMenu) return false;
      if (filter === 'standalone' && r.inMenu) return false;
      if (filter === 'india' && !r.surfaces.india) return false;
      if (filter === 'africa' && !r.surfaces.africa) return false;
      if (filter === 'group' && !r.surfaces.group) return false;
      if (!term) return true;
      if (numOnly) return String(r.no) === numOnly;
      return (`${r.label} ${r.route} ${r.breadcrumb}`).toLowerCase().includes(term);
    });
  }, [rows, q, filter]);

  const selected = rows.find((r) => r.route === sel) || null;
  const dev = DEVICES.find((d) => d.key === device) || DEVICES[0];

  const doCopy = async (r) => {
    const ok = await copyText(buildIssueToken({ route: r.route }));
    if (ok) toastSuccess(`Screen #${r.no} details copied.`);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 max-w-[380px]">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, route, or #number…"
            aria-label="Search screens"
            className="w-full rounded-lg border border-surface-border bg-surface py-2 pl-9 pr-3 text-sm text-ink outline-none focus:border-navy/30 focus:ring-2 focus:ring-gold/40"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                filter === f.key ? 'border-gold bg-gold-light/30 text-navy' : 'border-surface-border bg-surface text-ink-muted hover:bg-surface-alt'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="ml-auto font-mono text-xs tabular-nums text-ink-subtle">{filtered.length} of {rows.length} screens</span>
      </div>

      {/* Split: list + live preview */}
      <div className="grid grid-cols-1 gap-4 desktop:grid-cols-[380px_1fr]" style={{ height: 'min(78vh, 760px)', minHeight: 480 }}>
        {/* List */}
        <div ref={listRef} className="min-h-0 overflow-y-auto rounded-xl border border-surface-border bg-surface">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-subtle">No screens match.</div>
          ) : filtered.map((r) => {
            const active = r.route === sel;
            return (
              <button
                key={r.route}
                onClick={() => setSel(r.route)}
                aria-current={active ? 'true' : undefined}
                className={`flex w-full items-start gap-2.5 border-b border-surface-border/70 px-3 py-2.5 text-left transition-colors last:border-b-0 ${
                  active ? 'bg-navy/5' : 'hover:bg-surface-alt'
                }`}
              >
                <span className="mt-0.5 shrink-0 font-mono text-[11px] font-bold tabular-nums text-navy">#{r.no}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-semibold text-ink">{r.label}</span>
                    {r.retired && <span className="shrink-0 rounded bg-ink/10 px-1 text-[9px] font-bold uppercase text-ink-subtle">retired</span>}
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-[10.5px] text-ink-subtle">{r.route}</span>
                </span>
                <span className="mt-0.5 flex shrink-0 gap-1">
                  {r.surfaces.india && <span className={`rounded px-1 text-[9px] font-bold ${SURFACE_CHIP.india}`} title="India branch">IN</span>}
                  {r.surfaces.africa && <span className={`rounded px-1 text-[9px] font-bold ${SURFACE_CHIP.africa}`} title="Africa branch">AF</span>}
                  {r.surfaces.group && <span className={`rounded px-1 text-[9px] font-bold ${SURFACE_CHIP.group}`} title="TK Group Central">GR</span>}
                </span>
              </button>
            );
          })}
        </div>

        {/* Preview */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-surface-border bg-surface-alt">
          {selected ? (
            <>
              <div className="flex flex-wrap items-center gap-2 border-b border-surface-border bg-surface px-3 py-2">
                <span className="font-mono text-sm font-bold text-navy">#{selected.no}</span>
                <span className="truncate text-sm font-semibold text-ink">{selected.label}</span>
                <span className="truncate font-mono text-[11px] text-ink-subtle">{selected.route}</span>
                <div className="ml-auto flex items-center gap-1">
                  {DEVICES.map((d) => (
                    <button
                      key={d.key}
                      onClick={() => setDevice(d.key)}
                      title={d.label}
                      aria-pressed={device === d.key}
                      className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
                        device === d.key ? 'border-navy/20 bg-navy/5 text-navy' : 'border-surface-border text-ink-muted hover:bg-surface-alt'
                      }`}
                    >
                      <d.icon size={15} />
                    </button>
                  ))}
                  <span className="mx-1 h-5 w-px bg-surface-border" />
                  <button onClick={() => doCopy(selected)} title="Copy report details"
                    className="flex h-8 items-center gap-1.5 rounded-md border border-surface-border px-2.5 text-xs font-medium text-ink-muted hover:bg-surface-alt">
                    <Copy size={14} /> Copy
                  </button>
                  <button onClick={() => window.open(`${selected.route}?embed=1`, '_blank', 'noopener')}
                    title="Open this screen full-window in a new tab"
                    className="flex h-8 items-center gap-1.5 rounded-md border border-navy/15 bg-navy px-2.5 text-xs font-semibold text-white hover:bg-navy/90">
                    <ExternalLink size={14} /> Open
                  </button>
                </div>
              </div>
              <div className="flex min-h-0 flex-1 justify-center overflow-auto bg-ink/5 p-3">
                <iframe
                  key={selected.route}
                  title={`Preview ${selected.label}`}
                  src={`${selected.route}?embed=1`}
                  className="h-full rounded-lg border border-surface-border bg-surface shadow-sm"
                  style={{ width: dev.width, maxWidth: '100%' }}
                />
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-ink-subtle">
              <Monitor size={30} className="opacity-40" />
              <p className="text-sm">Select a screen on the left to preview it live here.</p>
              <p className="max-w-[42ch] text-xs">Tip: paste a number from a support report (e.g. <span className="font-mono">142</span>) into the search box to jump straight to that screen.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ScreenDirectory;
