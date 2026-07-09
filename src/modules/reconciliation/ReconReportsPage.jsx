import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CalendarClock, AlertTriangle } from 'lucide-react';
import { getPending, getList } from './api';
import { BRANCHES, TIERS, tierOf, statusMeta, currencyOf, fmtAmt, chainProgress, pendingStateMeta, fmtDue } from './utils';
import { PageSection, Badge, Button, EmptyState, LoadingState, Select, FormField } from '../../shell/primitives';

// ─── Reconciliation · Reports & Pending ──────────────────────────────────────
// Lives ONLY under the Reconciliation header. Three reports, all branch-wise:
//   1 · Pending Closings — the agreed go-live backlog (FY2025-26 year-end,
//       month-ends from Apr 2026, weekly cycles due every FRIDAY from W29),
//       each row's status computed live from the certificates in the DB.
//   2 · Certificate Register — filterable list of every certificate.
//   3 · Open Exceptions — every unresolved exception blocking a signature.

const cellCls = 'px-3 py-2.5 text-sm border-b border-surface-border align-middle';
const headCls = 'px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-ink-muted bg-surface-alt border-b border-surface-border whitespace-nowrap';

export function ReconReportsPage({ branch: appBranch, setRoute }) {
  const [branch, setBranch] = useState(BRANCHES.includes(appBranch) ? appBranch : 'BOM');
  const [tierFilter, setTierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ['recon-certs', 'pending', branch], queryFn: () => getPending({ branch }),
  });
  const { data: certs = [], isLoading: certsLoading } = useQuery({
    queryKey: ['recon-certs', 'register', branch], queryFn: () => getList({ branch }),
  });

  const pendingRows = pendingData?.rows || [];
  const registerRows = certs.filter((c) => (!tierFilter || c.tier === tierFilter) && (!statusFilter || c.status === statusFilter));
  const exceptionRows = certs.flatMap((c) => (c.exceptions || []).filter((e) => !e.resolved)
    .map((e) => ({ cert: c, text: e.text })));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="kbiz-page-title">Reconciliation — Reports &amp; Pending</h1>
          <p className="text-sm text-ink-muted">The closing backlog and the certificate register — branch-wise, never mixed.</p>
        </div>
        <Button variant="ghost" icon={ArrowLeft} onClick={() => setRoute && setRoute('/reconciliation')}>Back to Reconciliation</Button>
      </div>

      {/* branch chips */}
      <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Branch">
        {BRANCHES.map((b) => (
          <button key={b} type="button" role="tab" aria-selected={branch === b} onClick={() => setBranch(b)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${branch === b ? 'border-transparent bg-navy text-white' : 'border-surface-border bg-surface text-ink-muted hover:border-ink/20'}`}>
            {b} <span className="ml-1 text-xs opacity-60">{currencyOf(b)}</span>
          </button>
        ))}
      </div>

      {/* 1 · pending closings */}
      <PageSection title="1 · Pending Closings" icon={CalendarClock}
        subtitle="Go-live plan: Year-End — India FY2025-26 (Apr–Mar) · Africa CY2025 (Jan–Dec) · Month-End closings from April 2026 · Weekly reconciliation from W29, due every Friday. A row leaves this board only when every ledger certificate in it is locked.">
        {pendingLoading && <LoadingState label="Loading pending closings…" />}
        {!pendingLoading && pendingRows.length === 0 && <EmptyState title="Nothing pending" hint="Every scheduled closing is complete for this branch." />}
        {pendingRows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead><tr>
                <th className={headCls}>Closing</th><th className={headCls}>Tier</th><th className={headCls}>Period</th>
                <th className={headCls}>Due</th><th className={headCls}>Ledgers signed</th><th className={headCls}>Status</th>
              </tr></thead>
              <tbody>
                {pendingRows.map((r) => {
                  const t = tierOf(r.tier);
                  const st = pendingStateMeta(r);
                  return (
                    <tr key={`${r.tier}:${r.period}`} className={r.upcoming ? 'bg-info-soft/30' : undefined}>
                      <td className={cellCls}>
                        <span className="font-semibold text-ink">{r.label}</span>
                        {r.note ? <div className="text-xs text-ink-subtle">{r.note}</div> : null}
                      </td>
                      <td className={cellCls}><Badge tone={t.tone} size="sm">{t.short}</Badge></td>
                      <td className={`${cellCls} font-mono text-xs`}>{r.period}</td>
                      <td className={cellCls}>{fmtDue(r)}</td>
                      <td className={`${cellCls} tabular-nums`}>{r.total ? `${r.done} / ${r.total}` : '—'}</td>
                      <td className={cellCls}><Badge tone={st.tone} size="sm" dot>{st.label}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>

      {/* 2 · certificate register */}
      <PageSection title="2 · Certificate Register" subtitle={`Every reconciliation certificate for ${branch}, across all tiers and periods.`}>
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <FormField label="Tier">
            <Select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}>
              <option value="">All tiers</option>
              {TIERS.map((t) => <option key={t.key} value={t.key}>{t.short}</option>)}
            </Select>
          </FormField>
          <FormField label="Status">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option value="open">Open</option><option value="reconciled">Reconciled</option>
              <option value="signed">Signed</option><option value="locked">Locked</option>
            </Select>
          </FormField>
          <span className="mb-2 ml-auto text-xs text-ink-subtle tabular-nums">{registerRows.length} certificate{registerRows.length === 1 ? '' : 's'}</span>
        </div>
        {certsLoading && <LoadingState label="Loading register…" />}
        {!certsLoading && registerRows.length === 0 && <EmptyState title="No certificates match" hint="Generate certificates from the Reconciliation Hub, or clear the filters." />}
        {registerRows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse">
              <thead><tr>
                <th className={headCls}>Certificate</th><th className={headCls}>Ledger</th><th className={headCls}>Group</th>
                <th className={headCls}>Period</th><th className={headCls}>Difference</th><th className={headCls}>Signatures</th><th className={headCls}>Status</th>
              </tr></thead>
              <tbody>
                {registerRows.map((c) => {
                  const meta = statusMeta(c.status);
                  const prog = chainProgress(c);
                  return (
                    <tr key={c._id}>
                      <td className={`${cellCls} font-mono text-xs`}>{c.certNo}</td>
                      <td className={cellCls}><span className="font-semibold text-ink">{c.ledger.name}</span><div className="font-mono text-xs text-ink-subtle">{c.ledger.code}</div></td>
                      <td className={cellCls}><span className="text-xs text-ink-muted">{c.ledger.parentGroup} › {c.ledger.subGroup}</span></td>
                      <td className={`${cellCls} font-mono text-xs`}>{c.period}</td>
                      <td className={`${cellCls} tabular-nums`}>{c.snapshot?.frozenAt ? fmtAmt(c.snapshot.difference, c.branch) : <span className="text-ink-subtle">not frozen</span>}</td>
                      <td className={`${cellCls} tabular-nums`}>{prog.done}/{prog.total}{prog.next ? ` · next ${prog.next.role}` : ''}</td>
                      <td className={cellCls}><Badge tone={meta.tone} size="sm" dot>{meta.label}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>

      {/* 3 · open exceptions */}
      <PageSection title="3 · Open Exceptions" icon={AlertTriangle}
        subtitle="Unresolved exceptions block their certificate's signatures (Rule 03) — this is the fix-first list.">
        {exceptionRows.length === 0
          ? <EmptyState title="No open exceptions" hint="Nothing is blocking a signature right now." />
          : (
            <ul className="grid gap-2">
              {exceptionRows.map((x, i) => (
                <li key={`${x.cert._id}-${i}`} className="flex flex-wrap items-center gap-3 rounded-brand border border-warning/30 bg-warning-soft/30 px-3 py-2 text-sm">
                  <AlertTriangle size={15} className="shrink-0 text-warning" aria-hidden="true" />
                  <span className="flex-1 text-ink">{x.text}</span>
                  <span className="font-semibold text-ink">{x.cert.ledger.name}</span>
                  <span className="font-mono text-xs text-ink-subtle">{x.cert.certNo}</span>
                </li>
              ))}
            </ul>
          )}
      </PageSection>
    </div>
  );
}
