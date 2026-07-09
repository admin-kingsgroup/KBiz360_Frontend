import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDevFindings } from './api/monitor';
import { moduleMapRows, moduleHealthLabel, moduleHealthTone, needLabel, needTone } from './utils/setupReadiness';
import { Badge } from '../../shell/primitives';
// Dev findings ride the SAME registry + tracking rows as /dev/control and the
// Tower's Development tab (shared ['dev-control','status'] cache) — fixing an
// item there clears it off this map on the next read.
import { openDevByModule, STATUS_META as DEV_STATUS_META } from '../devControl/registry';

// ─── TK GROUP · FE · Setup Readiness — Module map (11 heads · 75 sub-modules) ──
// The whole ERP as a setup checklist: every sub-module of the 75-module tree with
// its LIVE health (from the adoption engine, branch-scoped), and what it still
// needs — MANUAL CONFIGURATION (the team enters data / finishes setup), DEVELOPMENT
// (open findings from the developer registry), both, or nothing. Expand a row for
// the fix narration: the exact missing milestones with a Set-up link on the config
// side, and each dev finding's "how to fix" remark on the developer side.

function DevPill({ status }) {
  const m = DEV_STATUS_META[status] || DEV_STATUS_META.audit;
  return <span style={{ display: 'inline-block', padding: '1px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap', color: m.color, background: m.bg }}>{m.label}</span>;
}

function FixNarration({ row, setRoute }) {
  const go = (link) => (setRoute ? setRoute(link) : (window.location.href = link));
  const dev = row.devItems.filter((i) => i.status !== 'dormant');
  const dormantDev = row.devItems.filter((i) => i.status === 'dormant');
  const hasConfig = (row.missing && row.missing.length) || (row.config && row.config.length);
  return (
    <div className="grid gap-3 border-t border-surface-border bg-surface-alt/40 px-4 py-3 text-[12px]">
      {hasConfig ? (
        <div>
          <div className="mb-1 font-bold uppercase tracking-wide text-[10.5px] text-ink-subtle">Team to-do — manual configuration{row.owners && row.owners.length ? ` · ${row.owners.join(' / ')}` : ''}</div>
          <ul className="ml-4 list-disc space-y-0.5 text-ink-muted">
            {(row.missing || []).map((m) => (
              <li key={m.label}>
                Enter <b className="text-ink">{m.label}</b>
                {row.totalUnits > 1 && m.branches && m.branches.length ? <> — still missing in {m.branches.join(', ')}</> : null}
              </li>
            ))}
            {(row.config || []).map((c) => (
              <li key={c.key}>
                {c.note}{' '}
                {c.link && <button type="button" onClick={() => go(c.link)} className="font-medium text-info hover:underline">Open →</button>}
              </li>
            ))}
          </ul>
          {row.link && (
            <button type="button" onClick={() => go(row.link)} className="mt-1.5 text-[12px] font-semibold text-info hover:underline">
              Set up → {row.link}
            </button>
          )}
        </div>
      ) : row.health === 'live' ? (
        <div className="text-ink-muted">✓ Every live milestone is met — nothing for the team to configure.</div>
      ) : null}

      {dev.length > 0 && (
        <div>
          <div className="mb-1 font-bold uppercase tracking-wide text-[10.5px] text-ink-subtle">Developer to-do — from the dev registry</div>
          <div className="grid gap-1.5">
            {dev.map((i) => (
              <div key={i.id} className="rounded-md border border-surface-border bg-surface px-2.5 py-1.5">
                <div className="flex flex-wrap items-center gap-2"><DevPill status={i.status} /><b className="text-ink">{i.name}</b></div>
                {i.note && <div className="mt-0.5 text-ink-muted">What's wrong: {i.note}</div>}
                {i.remark && <div className="mt-0.5 text-ink">How to fix: {i.remark}</div>}
              </div>
            ))}
          </div>
          {setRoute && (
            <button type="button" onClick={() => setRoute('/dev/control')} className="mt-1.5 text-[12px] font-semibold text-accent hover:underline">
              Track in Developer Control →
            </button>
          )}
        </div>
      )}

      {dormantDev.length > 0 && (
        <div className="text-ink-subtle">
          Dormant by design: {dormantDev.map((i) => i.name).join(' · ')} — built, intentionally switched off; no work pending.
        </div>
      )}
    </div>
  );
}

function ModuleRow({ row, open, onToggle, setRoute }) {
  // The finance team's fast path: a config-needing row gets its Set-up action right on
  // the row — no need to expand first. stopPropagation so the click navigates, not toggles.
  const setupLink = (row.need === 'config' || row.need === 'both') && row.link;
  const goSetup = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (setRoute) setRoute(row.link); else window.location.href = row.link;
  };
  return (
    <div className="overflow-hidden rounded-lg border border-surface-border bg-surface">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface-alt">
        <span className="w-3 shrink-0 text-ink-subtle">{open ? '▾' : '▸'}</span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-medium text-ink">{row.name}</span>
            <Badge tone={moduleHealthTone(row.health)} size="sm">
              {moduleHealthLabel(row.health, row.kind)}
              {row.health && row.totalUnits > 1 ? ` · ${row.liveUnits}/${row.totalUnits}` : ''}
            </Badge>
            <Badge tone={needTone(row.need)} size="sm">{needLabel(row.need)}</Badge>
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-ink-muted">{row.remark}</span>
        </span>
        {row.health && row.pct != null && <span className="shrink-0 tabular-nums text-[11.5px] font-bold text-ink-muted">{row.pct}%</span>}
        {setupLink && (
          <span role="button" tabIndex={0} onClick={goSetup}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') goSetup(e); }}
            className="shrink-0 whitespace-nowrap rounded-md border border-accent/40 px-2.5 py-1 text-[12px] font-semibold text-accent hover:bg-accent hover:text-white">
            Set up →
          </span>
        )}
      </button>
      {open && <FixNarration row={row} setRoute={setRoute} />}
    </div>
  );
}

export function ModuleReadinessMap({ data, branch = 'ALL', setRoute } = {}) {
  const trackQ = useQuery({ queryKey: ['dev-control', 'status'], queryFn: getDevFindings, staleTime: 30_000 });
  const trackMap = {};
  (trackQ.data || []).forEach((r) => { trackMap[r.itemId] = r; });
  const heads = moduleMapRows(data, branch, openDevByModule(trackMap));
  const [openHeads, setOpenHeads] = useState({});
  const [openRows, setOpenRows] = useState({});
  if (!heads.length) return null;

  const all = heads.flatMap((h) => h.rows);
  const totals = {
    live: all.filter((r) => r.health === 'live').length,
    config: all.filter((r) => r.need === 'config' || r.need === 'both').length,
    dev: all.filter((r) => r.need === 'dev' || r.need === 'both').length,
    both: all.filter((r) => r.need === 'both').length,
  };

  return (
    <div className="grid gap-3" data-testid="tk-readiness-modulemap">
      <div>
        <h3 className="text-[15px] font-bold text-ink">Module map — {heads.length} head modules · {all.length} sub-modules{branch !== 'ALL' ? ` · ${branch}` : ''}</h3>
        <p className="mt-0.5 text-xs text-ink-muted">
          Every module of the ERP with its live health and what it still needs: <b>Manual configuration</b> = the team enters
          data / finishes setup (auto-clears the moment the data exists) · <b>Development</b> = open findings from the developer
          registry (clear them in Dev Control) · <b>Both</b> = the two together. Expand a row for the exact fix narration.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge tone="success" size="sm">{totals.live} live</Badge>
          <Badge tone="warning" size="sm">{totals.config} need configuration</Badge>
          <Badge tone="info" size="sm">{totals.dev} need development</Badge>
          <Badge tone="danger" size="sm">{totals.both} need both</Badge>
        </div>
      </div>

      {heads.map((h) => {
        const open = openHeads[h.head] !== false; // default open
        const s = h.summary;
        return (
          <div key={h.head} className="rounded-xl border border-surface-border bg-surface p-3">
            <button type="button" onClick={() => setOpenHeads((p) => ({ ...p, [h.head]: !open }))} className="flex w-full items-center gap-2 text-left">
              <span className="w-3 text-ink-subtle">{open ? '▾' : '▸'}</span>
              <span className="flex-1 text-[13.5px] font-bold text-ink">{h.head}</span>
              <span className="flex shrink-0 flex-wrap items-center gap-1.5 text-[11px]">
                {s.live > 0 && <Badge tone="success" size="sm">{s.live} live</Badge>}
                {s.partial > 0 && <Badge tone="warning" size="sm">{s.partial} partly</Badge>}
                {s.dormant > 0 && <Badge tone="danger" size="sm">{s.dormant} not started</Badge>}
                {s.dev > 0 && <Badge tone="info" size="sm">{s.dev} dev</Badge>}
                <span className="tabular-nums text-ink-subtle">{h.rows.length} modules</span>
              </span>
            </button>
            {open && (
              <div className="mt-2 grid gap-1.5">
                {h.rows.map((r) => (
                  <ModuleRow key={r.id} row={r} open={!!openRows[r.id]} setRoute={setRoute}
                    onToggle={() => setOpenRows((p) => ({ ...p, [r.id]: !p[r.id] }))} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
