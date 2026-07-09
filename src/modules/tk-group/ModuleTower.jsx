import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getModules, getIntegrityDetail } from './api/monitor';
import { statusTone, countLabel, sevTone, sevLabel, heads as headsOf, moduleKpis, issuesFor } from './utils/modules';
import { ResponsiveGrid, Badge } from '../../shell/primitives';
import { KpiTile } from '../dashboard/components/cards/KpiTile';
import { BRANCHES } from '../../core/referenceCache';
import { curSym } from './utils/currency';

// A module issue carries `br` (branch code); its amount is in that branch's own
// currency — ₹ for India, $ for the USD books (NBO/DAR/FBM). Group-level issues
// (no branch) fall back to ₹.
const brSym = (code) => curSym((BRANCHES.find((b) => b.code === code) || {}).currency);

// ─── TK GROUP · FE · Control Tower by Module ─────────────────────────────────
// The 75-module tree: a sidebar of head modules → sub-modules each with a live issue
// count (Health + Integrity + Adoption, branchwise). Click a head/module to see its
// problems; expand an integrity finding to drill to the exact ledgers / parties /
// vouchers (via /monitor/integrity/detail). Read-only; live.

const CNT = { c: 'crit', w: 'warn', g: 'good', d: 'dormant' };
const fmt = (n) => (n ? new Intl.NumberFormat('en-IN').format(Math.round(Number(n) || 0)) : '');

function Count({ status, count }) {
  const tone = statusTone(status);
  return <span className={`tk-cnt tk-${CNT[tone]}`}>{countLabel(status, count)}</span>;
}

// Drill-down for one integrity finding → its full offending list.
function Detail({ branch, checkId }) {
  const q = useQuery({ queryKey: ['tk', 'monitor', 'integrity', 'detail', branch, checkId], queryFn: () => getIntegrityDetail(branch, checkId), staleTime: 60_000 });
  const rows = (q.data && q.data.rows) || [];
  if (q.isLoading) return <div className="px-3 py-2 text-xs text-ink-subtle">Loading…</div>;
  if (!rows.length) return <div className="px-3 py-2 text-xs text-ink-subtle">No line-level list for this item.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead><tr className="text-left text-ink-subtle"><th className="py-1 pl-9 font-medium">Reference</th><th className="font-medium">Detail</th><th className="pr-3 text-right font-medium">Amount</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-surface-border/60">
              <td className="py-1 pl-9 text-ink">{r.ref}</td><td className="capitalize text-ink-muted">{r.primary}{r.secondary ? ` · ${r.secondary}` : ''}</td><td className="pr-3 text-right tabular-nums text-ink">{r.amount ? `${brSym(branch)}${fmt(r.amount)}` : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {q.data && q.data.count > rows.length && <div className="px-3 py-1 text-[11px] text-ink-subtle">Showing {rows.length} of {q.data.count}.</div>}
    </div>
  );
}

function Issue({ issue, showMod, open, onToggle, setRoute }) {
  const canDrill = issue.source === 'integrity' && issue.checkId;
  return (
    <div className="overflow-hidden rounded-lg border border-surface-border bg-surface" style={{ borderLeft: `4px solid ${issue.sev === 'error' ? '#b23b3b' : issue.sev === 'warn' ? '#a86a10' : '#3a6fd0'}` }}>
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface-alt">
        <span className="w-3 text-ink-subtle">{canDrill ? (open ? '▾' : '▸') : '•'}</span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
            {showMod && issue.mod && <Badge tone="info" size="sm">{issue.mod}</Badge>}
            {issue.title}
            <Badge tone={sevTone(issue.sev)} size="sm">{sevLabel(issue.sev)}</Badge>
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-ink-muted">{issue.detail}</span>
        </span>
        <span className="flex items-center gap-2">
          {issue.amount ? <span className="tabular-nums text-sm font-bold text-ink">{brSym(issue.br)}{fmt(issue.amount)}</span> : issue.count ? <span className="tabular-nums text-sm font-bold text-ink">{issue.count}</span> : null}
          {issue.br && <Badge tone="neutral" size="sm">{issue.br}</Badge>}
        </span>
      </button>
      {open && canDrill && <div className="border-t border-surface-border pb-1"><Detail branch={issue.br} checkId={issue.checkId} /></div>}
      {open && !canDrill && issue.link && (
        <div className="border-t border-surface-border px-9 py-2 text-[12px]">
          <button type="button" onClick={() => (setRoute ? setRoute(issue.link) : (window.location.href = issue.link))} className="font-medium text-info hover:underline">Open the fix screen →</button>
        </div>
      )}
    </div>
  );
}

export function ModuleTower({ setRoute } = {}) {
  const q = useQuery({ queryKey: ['tk', 'monitor', 'modules'], queryFn: getModules, staleTime: 60_000 });
  const d = q.data || {};
  const heads = headsOf(d);
  const kpis = moduleKpis(d);
  const [openHeads, setOpenHeads] = useState({});
  // Selection is stored by ID (head name + module id), resolved against the LIVE data each
  // render — so a background refetch (new object identities) never drops the highlight or
  // shows stale issues.
  const [sel, setSel] = useState(null);          // { head: headName, module: moduleId|null }
  const [openIssue, setOpenIssue] = useState(new Set());
  const selHead = sel ? heads.find((h) => h.head === sel.head) : null;
  const selMod = selHead && sel.module ? (selHead.modules || []).find((m) => m.id === sel.module) : null;
  const resolvedSel = selHead ? { head: selHead, module: selMod } : null;

  const rows = useMemo(() => issuesFor(d, resolvedSel), [d, resolvedSel]);
  const toggleIssue = (k) => setOpenIssue((p) => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const crumb = selMod ? selHead.head : selHead ? 'Head module' : 'Overview';
  const title = selMod ? selMod.name : selHead ? selHead.head : `All open issues · ${kpis.modules || 75} modules`;
  const emptyMsg = selMod
    ? (selMod.status === 'dormant' ? 'Built but not yet used on any branch — no data to monitor.'
      : selMod.status === 'system' ? 'Infrastructure module — nothing to monitor here.'
        : selMod.status === 'engine' ? 'This module powers the Control Tower itself.'
          : '✓ No open issues — clean across branches.')
    : '✓ No open issues here — clean.';

  return (
    <div className="grid gap-4">
      <style>{`.tk-cnt{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10.5px;font-weight:700;min-width:19px;text-align:center;padding:1px 6px;border-radius:999px;background:var(--surface-alt,#eef);color:var(--ink-muted,#667)}
        .tk-crit{background:color-mix(in srgb,#cf3b3b 15%,transparent);color:#cf3b3b}.tk-warn{background:color-mix(in srgb,#b5771a 16%,transparent);color:#b5771a}
        .tk-good{background:color-mix(in srgb,#22855c 15%,transparent);color:#22855c}.tk-dormant{color:#8a90a6;border:1px dashed currentColor;background:transparent}`}</style>

      <ResponsiveGrid min="150px" gap="md">
        <KpiTile label="Critical" value={`${kpis.errors}`} sub="block close" color={kpis.errors ? '#b23b3b' : '#1a7a4c'} />
        <KpiTile label="Warnings" value={`${kpis.warnings}`} sub="to review" color="#a86a10" />
        <KpiTile label="Info" value={`${kpis.info}`} sub="" color="#1a1c22" />
        <KpiTile label="Dormant modules" value={`${kpis.dormant}`} sub="built, unused" color="#7a8090" />
      </ResponsiveGrid>

      <div className="grid gap-4 tablet:grid-cols-[300px_minmax(0,1fr)]">
        {/* Module tree */}
        <div className="rounded-lg border border-surface-border bg-surface p-2">
          <button type="button" onClick={() => setSel(null)} className={`mb-1 w-full rounded-md px-2 py-1.5 text-left text-[13px] font-semibold ${!sel ? 'bg-accent/10 text-accent' : 'text-ink hover:bg-surface-alt'}`}>All modules ({kpis.modules})</button>
          {heads.map((h) => {
            const open = openHeads[h.head];
            const headSel = sel && sel.head === h.head && !sel.module;
            return (
              <div key={h.head}>
                <div className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-semibold ${headSel ? 'bg-accent/10 text-accent' : 'text-ink hover:bg-surface-alt'}`}>
                  <button type="button" onClick={() => setOpenHeads((p) => ({ ...p, [h.head]: !open }))} className="w-3 text-ink-subtle">{open ? '▾' : '▸'}</button>
                  <button type="button" onClick={() => { setOpenHeads((p) => ({ ...p, [h.head]: true })); setSel({ head: h.head, module: null }); }} className="flex-1 truncate text-left">{h.head}</button>
                  <Count status={h.status} count={h.count} />
                </div>
                {open && (
                  <div className="ml-3 border-l border-surface-border pl-1">
                    {h.modules.map((m) => (
                      <button key={m.id} type="button" onClick={() => setSel({ head: h.head, module: m.id })}
                        className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[12.5px] ${sel && sel.module === m.id ? 'bg-accent/10 font-semibold text-accent' : 'text-ink-muted hover:bg-surface-alt hover:text-ink'}`}>
                        <span className="flex-1 truncate">{m.name}</span><Count status={m.status} count={m.count} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Issues */}
        <div>
          <div className="mb-3"><div className="text-[10.5px] font-bold uppercase tracking-wide text-ink-subtle">{crumb}</div><h2 className="text-lg font-bold text-ink">{title}</h2></div>
          {q.isError ? <div className="rounded-lg border border-dashed border-danger p-8 text-center text-sm text-danger">Couldn’t load the module tree — the roll-up failed. Retry shortly.</div>
            : q.isLoading ? <div className="text-xs text-ink-subtle">Loading module tree…</div>
              : rows.length ? (
                <div className="grid gap-2">
                  {rows.map((i, idx) => {
                    const k = `${i.br}:${i.mod || (selMod && selMod.id)}:${i.title}:${idx}`;
                    return <Issue key={k} issue={i} showMod={!selMod} open={openIssue.has(k)} onToggle={() => toggleIssue(k)} setRoute={setRoute} />;
                  })}
                </div>
              ) : <div className={`rounded-lg border border-dashed p-8 text-center text-sm ${selMod && ['dormant', 'system', 'engine'].includes(selMod.status) ? 'border-surface-border text-ink-subtle' : 'border-success text-success'}`}>{emptyMsg}</div>}
        </div>
      </div>
    </div>
  );
}
