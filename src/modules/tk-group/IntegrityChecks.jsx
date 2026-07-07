import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getIntegrity, getIntegrityDetail, getFindingStatus, saveFindingStatus } from './api/monitor';
import { integrityKpis, branchCards, matrixRows, branchKeys, findingRows, statusTone, statusGlyph } from './utils/integrity';
import { PageSection, ResponsiveGrid, Badge, Button, Input, Select, FormField } from '../../shell/primitives';
import { KpiTile } from '../dashboard/components/cards/KpiTile';
import { DataTable } from '../../shell/DataTable';

// ─── TK GROUP · FE · Close-Readiness & Integrity (SAP-style checklist) ───────
// A branch-wise financial-close cockpit: accounting-integrity + governance gates that
// a period must pass before lock (journal drift, orphan journals, self-approvals, dup
// numbers/masters, suspense, sub-ledger↔GL, FX revaluation, depreciation, accruals,
// GSTR-2B). LIVE — a fix clears the gate on refresh. Read-only; dormant-safe.

const TONE_COLOR = { pass: '#1a7a4c', fail: '#b23b3b', warn: '#a86a10', na: '#7a8090' };

function Cell({ status }) {
  return (
    <span title={status} className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-bold"
      style={{ color: TONE_COLOR[status], background: `${TONE_COLOR[status]}1a` }}>{statusGlyph(status)}</span>
  );
}

const fmt = (n) => (n ? new Intl.NumberFormat('en-IN').format(Math.round(n)) : '');

// Drill-down: the FULL offending list for one gate on one branch, fetched on expand.
function FindingDetail({ branch, checkId }) {
  const q = useQuery({ queryKey: ['tk', 'monitor', 'integrity', 'detail', branch, checkId], queryFn: () => getIntegrityDetail(branch, checkId), staleTime: 60_000 });
  const rows = (q.data && q.data.rows) || [];
  if (q.isLoading) return <div className="px-3 py-2 text-xs text-ink-subtle">Loading…</div>;
  if (!rows.length) return <div className="px-3 py-2 text-xs text-ink-subtle">No line-level detail to list for this gate.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-ink-subtle">
            <th className="py-1 pl-9 font-medium">Reference</th><th className="font-medium">Detail</th><th className="font-medium">Note</th><th className="pr-3 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-surface-border/60">
              <td className="py-1 pl-9 text-ink">{r.ref}</td>
              <td className="capitalize text-ink-muted">{r.primary}</td>
              <td className="text-ink-subtle">{r.secondary}</td>
              <td className="pr-3 text-right tabular-nums text-ink">{fmt(r.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {q.data && q.data.count > rows.length && <div className="px-3 py-1 text-[11px] text-ink-subtle">Showing {rows.length} of {q.data.count}.</div>}
    </div>
  );
}

// Assign an owner / status / due date to a finding (branch × gate).
function AssignBar({ branch, checkId, current, onSave, saving }) {
  const [owner, setOwner] = useState((current && current.owner) || '');
  const [status, setStatus] = useState((current && current.status) || 'open');
  const [dueDate, setDueDate] = useState((current && current.dueDate) || '');
  return (
    <div className="flex flex-wrap items-end gap-2 bg-surface-alt/60 px-9 py-2">
      <FormField label="Owner"><Input value={owner} placeholder="assignee" onChange={(e) => setOwner(e.target.value)} /></FormField>
      <FormField label="Status">
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="open">Open</option><option value="acknowledged">Acknowledged</option><option value="in-progress">In progress</option>
        </Select>
      </FormField>
      <FormField label="Due"><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></FormField>
      <Button size="sm" onClick={() => onSave({ branch, checkId, owner: owner.trim(), status, dueDate })} loading={saving}>Save</Button>
      {current && current.updatedBy && <span className="pb-2 text-[11px] text-ink-subtle">last set by {current.updatedBy}</span>}
    </div>
  );
}

export function IntegrityChecks() {
  const q = useQuery({ queryKey: ['tk', 'monitor', 'integrity'], queryFn: getIntegrity, staleTime: 60_000, refetchInterval: 300_000 });
  const d = q.data || {};
  const kpis = integrityKpis(d);
  const cards = branchCards(d);
  const branches = branchKeys(d);
  const rows = matrixRows(d);
  const findings = findingRows(d);
  const [open, setOpen] = useState(() => new Set());
  const toggle = (k) => setOpen((prev) => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  const qc = useQueryClient();
  const fsQ = useQuery({ queryKey: ['tk', 'finding-status'], queryFn: getFindingStatus, staleTime: 60_000 });
  const fsMap = useMemo(() => { const m = {}; (fsQ.data || []).forEach((r) => { m[`${r.branch}:${r.checkId}`] = r; }); return m; }, [fsQ.data]);
  const saveFs = useMutation({ mutationFn: saveFindingStatus, onSuccess: () => qc.invalidateQueries({ queryKey: ['tk', 'finding-status'] }) });

  const matrixCols = [
    { key: 'label', header: 'Integrity / Close gate', render: (r) => (
      <div><div className="font-medium text-ink">{r.label}</div><div className="text-[11px] text-ink-subtle">{r.category}</div></div>
    ) },
    ...branches.map((b) => ({ key: b, header: b, align: 'center', render: (r) => <Cell status={r.byBranch[b] || 'na'} /> })),
  ];

  return (
    <div className="grid gap-4">
      <ResponsiveGrid min="150px" gap="md" data-testid="tk-integrity-kpis">
        {kpis.map((k) => (
          <KpiTile key={k.key} label={k.label} value={k.value} sub={k.sub}
            color={k.key === 'fails' && Number(k.value) > 0 ? TONE_COLOR.fail : k.key === 'score' ? TONE_COLOR.pass : '#1a1c22'} />
        ))}
      </ResponsiveGrid>

      <PageSection title="Branch close-readiness — worst first">
        <ResponsiveGrid min="150px" gap="md">
          {cards.length ? cards.map((c) => (
            <div key={c.branch} className="rounded-lg border border-surface-border bg-surface p-3"
              style={{ borderLeft: `4px solid ${c.closeReady ? TONE_COLOR.pass : TONE_COLOR.fail}` }}>
              <div className="flex items-baseline justify-between">
                <b className="text-ink">{c.branch}</b>
                <span className="tabular-nums text-lg font-extrabold" style={{ color: c.closeReady ? TONE_COLOR.pass : TONE_COLOR.fail }}>{c.score}</span>
              </div>
              <div className="mt-1 flex gap-1.5 text-[11px]">
                {c.closeReady
                  ? <Badge tone="success" size="sm">Ready to close</Badge>
                  : <Badge tone="danger" size="sm">{c.fails} gate(s) failing</Badge>}
                {c.warns > 0 && <Badge tone="warning" size="sm">{c.warns} warn</Badge>}
              </div>
            </div>
          )) : <p className="text-xs text-ink-subtle">All branches close-ready.</p>}
        </ResponsiveGrid>
      </PageSection>

      <DataTable
        title="Integrity & close checklist — gate × branch"
        columns={matrixCols}
        rows={rows}
        getRowKey={(r) => r.id}
        loading={q.isLoading}
        isError={q.isError}
        emptyMessage="No checks configured."
        searchable
        showDensityToggle={false}
        zebra
        stickyHeader
      />

      <PageSection title="Findings — what blocks the close (click to drill down)">
        {findings.length ? (
          <div className="grid gap-1.5">
            {findings.map((f) => {
              const k = `${f.branch}:${f.id}`; // one finding per (branch, gate) — stable across refetch re-sorts
              const isOpen = open.has(k);
              const assigned = fsMap[`${f.branch}:${f.id}`];
              const hasOwner = assigned && (assigned.owner || (assigned.status && assigned.status !== 'open') || assigned.dueDate);
              return (
                <div key={k} className="rounded-lg border border-surface-border bg-surface">
                  <button type="button" onClick={() => toggle(k)} aria-expanded={isOpen}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface-alt">
                    <span className="w-3 text-ink-subtle">{isOpen ? '▾' : '▸'}</span>
                    <Badge tone={statusTone(f.status)} size="sm">{f.branch}</Badge>
                    <span className="font-medium text-ink">{f.label}</span>
                    <span className="hidden truncate text-[11px] text-ink-muted tablet:inline">— {f.detail}</span>
                    <span className="ml-auto flex items-center gap-2">
                      {hasOwner && <Badge tone="info" size="sm">{assigned.owner || 'assigned'}{assigned.status !== 'open' ? ` · ${assigned.status}` : ''}{assigned.dueDate ? ` · due ${assigned.dueDate}` : ''}</Badge>}
                      <Badge tone={f.status === 'fail' ? 'danger' : 'warning'} size="sm">{f.status === 'fail' ? 'blocks close' : 'review'}</Badge>
                      {f.count > 0 && <b className="tabular-nums text-ink">{f.count}</b>}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-surface-border pb-1">
                      {/* key on the assignment id so the form re-inits once the saved
                          assignment loads (avoids showing/saving blank over an existing one) */}
                      <AssignBar key={assigned?._id || 'unassigned'} branch={f.branch} checkId={f.id} current={assigned} saving={saveFs.isPending} onSave={(r) => saveFs.mutate(r)} />
                      <FindingDetail branch={f.branch} checkId={f.id} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : <p className="text-xs text-ink-subtle">No open findings — every branch is clean.</p>}
      </PageSection>
    </div>
  );
}
