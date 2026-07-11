import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, AlertTriangle, Lock, Unlock, CalendarCheck2 } from 'lucide-react';
import { PageLayout } from '../../../shell/PageLayout';
import { DataTable } from '../../../shell/DataTable';
import { apiGet, apiPost } from '../../../core/api';
import { CUR_FY } from '../../../core/dates';
import { toast, toastError } from '../../../core/ux/toast';
import { localeOf } from '../../../core/format';
import { bc } from '../../../core/styleTokens';

/* ════════════════════════════════════════════════════════════════════
   YEAR-END CLOSE — live (replaces the hardcoded 4-step demo wizard)
   ════════════════════════════════════════════════════════════════════
   Backed by /api/year-close/:v (yearEndClose.service):
     • gates      — TB ties · BS balances · no pending FY vouchers (live)
     • results    — per-branch FY Gross/Net Profit in branch currency
     • close      — snapshots the results + HARD-LOCKS all 12 FY periods
                    (PeriodLock 'ALL' rows, enforced via PolicyGuard)
     • reopen     — Super-Admin escape hatch (removes only this close's locks)

   Design note (matches the backend): this engine DERIVES retained earnings —
   the Balance Sheet's "Profit & Loss A/c" is the accumulated-P&L plug — so the
   close posts NO P&L→Retained-Earnings journal. It verifies, records, locks.
   ──────────────────────────────────────────────────────────────────── */

const money = (cur, n) => `${n < 0 ? '-' : ''}${cur}${Math.abs(Math.round(n || 0)).toLocaleString(localeOf(cur))}`;

const isSuperAdmin = () => {
  try { return /super.?admin/i.test((JSON.parse(localStorage.getItem('kb360-user') || 'null') || {}).role || ''); }
  catch { return false; }
};

/* Previous FY label ("2025-26" current → "2024-25") — the year one usually closes. */
function previousFyLabel() {
  const y = CUR_FY.startYear - 1;
  return `${y}-${String(y + 1).slice(2)}`;
}

function GateRow({ gate }) {
  return (
    <div className="flex items-center gap-3 border-b border-surface-border/60 py-2 text-[12.5px] last:border-0">
      {gate.pass
        ? <CheckCircle2 size={16} className="shrink-0" style={{ color: '#1a7f37' }} />
        : <AlertTriangle size={16} className="shrink-0" style={{ color: '#cf222e' }} />}
      <span className="flex-1" style={{ color: gate.pass ? undefined : '#cf222e', fontWeight: gate.pass ? 400 : 600 }}>{gate.label}</span>
      <span className="text-[11px] text-ink-subtle">{gate.detail}</span>
    </div>
  );
}

export function YearEndClosePage() {
  const qc = useQueryClient();
  const [fy, setFy] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const fysQ = useQuery({
    queryKey: ['fiscal-years'],
    queryFn: async () => (await apiGet('/api/fiscal-years')) || [],
    staleTime: 60_000,
  });
  const fys = fysQ.data || [];
  const selected = fy || (fys.find((f) => f.v === previousFyLabel()) ? previousFyLabel() : (fys[0] && fys[0].v) || '');

  const statusQ = useQuery({
    queryKey: ['year-close', selected],
    queryFn: () => apiGet(`/api/year-close/${encodeURIComponent(selected)}`),
    enabled: !!selected,
  });
  const s = statusQ.data;

  const closeMut = useMutation({
    mutationFn: () => apiPost(`/api/year-close/${encodeURIComponent(selected)}`),
    onSuccess: () => { toast(`FY ${selected} closed and locked.`); setConfirmed(false); qc.invalidateQueries({ queryKey: ['year-close'] }); qc.invalidateQueries({ queryKey: ['fiscal-years'] }); },
    onError: (e) => toastError(e?.message || 'Close failed'),
  });
  const reopenMut = useMutation({
    mutationFn: () => apiPost(`/api/year-close/${encodeURIComponent(selected)}/reopen`),
    onSuccess: () => { toast(`FY ${selected} reopened.`); qc.invalidateQueries({ queryKey: ['year-close'] }); qc.invalidateQueries({ queryKey: ['fiscal-years'] }); },
    onError: (e) => toastError(e?.message || 'Reopen failed'),
  });

  const resultCols = [
    { key: 'branch', header: 'Branch', className: 'font-medium' },
    { key: 'currency', header: 'Currency' },
    { key: 'grossProfit', header: 'Gross Profit (FY)', num: true, render: (r) => money(bc({ code: r.branch === 'ALL' ? 'BOM' : r.branch }).cur, r.grossProfit) },
    { key: 'netProfit', header: 'Net Profit (FY)', num: true, render: (r) => <b style={{ color: r.netProfit >= 0 ? '#1a7f37' : '#cf222e' }}>{money(bc({ code: r.branch === 'ALL' ? 'BOM' : r.branch }).cur, r.netProfit)}</b> },
  ];
  const lockCols = [
    { key: 'period', header: 'Period' },
    { key: 'status', header: 'Lock', render: (r) => <b style={{ color: r.status === 'hard' ? '#cf222e' : '#9a6700' }}>{r.status.toUpperCase()}</b> },
    { key: 'reason', header: 'Reason' },
    { key: 'lockedBy', header: 'Locked by' },
  ];

  const closedRecord = (s?.records || []).find((r) => r.status === 'closed' && r.branch === 'ALL') || (s?.records || []).find((r) => r.status === 'closed');

  return (
    <PageLayout
      title="Year-End Close"
      subtitle="Verify the FY books tie, snapshot the result, and hard-lock the year — live from the double-entry engine."
      actions={(
        <select value={selected} onChange={(e) => { setFy(e.target.value); setConfirmed(false); }}
          className="rounded-md border border-surface-border bg-surface px-2 py-1.5 text-sm">
          {fys.map((f) => <option key={f.v} value={f.v}>FY {f.v}{f.closed ? ' · closed' : f.isCurrent ? ' · current' : ''}</option>)}
        </select>
      )}
    >
      <div className="grid gap-4">
        {statusQ.isError && <p className="text-sm" style={{ color: '#cf222e' }}>{String(statusQ.error?.message || 'Failed to load close status')}</p>}
        {statusQ.isLoading && <p className="text-sm text-ink-subtle">Running the close gates against the live books…</p>}

        {s && (
          <>
            {/* closed banner */}
            {s.closed && closedRecord && (
              <div className="flex items-center gap-3 rounded-lg border px-4 py-3" style={{ background: '#e6f4ea', borderColor: '#1a7f3733' }}>
                <Lock size={18} style={{ color: '#1a7f37' }} />
                <div className="flex-1 text-[13px]" style={{ color: '#1a7f37' }}>
                  <b>FY {s.fy} is CLOSED.</b> Closed by {closedRecord.closedBy || '—'} on {String(closedRecord.closedAt || '').slice(0, 10)} · all 12 periods hard-locked group-wide.
                </div>
                {isSuperAdmin() && (
                  <button onClick={() => reopenMut.mutate()} disabled={reopenMut.isPending}
                    className="flex items-center gap-1.5 rounded-md border border-surface-border px-3 py-1.5 text-xs font-semibold hover:bg-surface-alt">
                    <Unlock size={13} /> Reopen (Super Admin)
                  </button>
                )}
              </div>
            )}

            {/* gates */}
            <section className="rounded-xl border border-surface-border bg-surface p-4">
              <h3 className="mb-1 text-[13px] font-bold text-ink">Close gates — {s.range.from} → {s.range.to}</h3>
              <p className="mb-2 text-[11px] text-ink-subtle">Every gate must pass before the year can be closed. Checked live against the books on every load.</p>
              {s.gates.map((g) => <GateRow key={g.key} gate={g} />)}
            </section>

            {/* per-branch results */}
            <DataTable
              title={`FY ${s.fy} result by branch (snapshotted at close)`}
              columns={resultCols}
              rows={s.results || []}
              getRowKey={(r) => r.branch}
              showDensityToggle={false}
              zebra
            />

            {/* design note */}
            <div className="rounded-lg border border-surface-border bg-surface-alt/60 px-4 py-3 text-[11.5px] leading-relaxed text-ink-muted">
              <b>Why no closing journal?</b> This engine derives retained earnings continuously — the Balance Sheet's
              “Profit &amp; Loss A/c” line is the accumulated-P&amp;L plug (split Opening Balance vs Current Period), so the new
              FY opens with the correct equity automatically. Posting a P&amp;L→Retained-Earnings transfer would double-count
              equity unless every P&amp;L report excluded it. The close therefore <b>verifies</b> (gates above), <b>records</b>
              (result snapshot), and <b>locks</b> (hard period locks below, enforced by the TK PolicyGuard).
            </div>

            {/* the act of closing */}
            {!s.closed && (
              <section className="rounded-xl border-2 bg-surface p-4" style={{ borderColor: s.allGatesPass ? '#1a7f3755' : '#cf222e55' }}>
                <h3 className="mb-1 flex items-center gap-2 text-[13px] font-bold text-ink"><CalendarCheck2 size={15} /> Close FY {s.fy}</h3>
                <p className="mb-3 text-[11.5px] text-ink-muted">
                  Closing snapshots the branch results above and hard-locks {s.range.periods.length} periods
                  ({s.range.periods[0]} … {s.range.periods[s.range.periods.length - 1]}) for every branch. A Super Admin can reopen later if something surfaces.
                </p>
                {!s.allGatesPass && (
                  <p className="mb-3 text-[12px] font-semibold" style={{ color: '#cf222e' }}>
                    Fix the failed gate(s) above first — the close is blocked until every gate passes.
                  </p>
                )}
                <label className="mb-3 flex cursor-pointer items-center gap-2 text-[12px] font-semibold" style={{ color: '#A32D2D' }}>
                  <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} style={{ accentColor: '#A32D2D' }} />
                  I confirm FY {s.fy}'s books are complete — snapshot the result and lock all {s.range.periods.length} periods.
                </label>
                <button
                  onClick={() => closeMut.mutate()}
                  disabled={!confirmed || !s.allGatesPass || closeMut.isPending}
                  className="rounded-md px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
                  style={{ background: '#A32D2D' }}
                >
                  🔒 {closeMut.isPending ? 'Closing…' : `Close & lock FY ${s.fy}`}
                </button>
              </section>
            )}

            {/* current locks on the FY periods */}
            <DataTable
              title={`Period locks on FY ${s.fy} (${(s.locks || []).length})`}
              columns={lockCols}
              rows={s.locks || []}
              getRowKey={(r) => `${r.branch}-${r.period}`}
              emptyMessage="No locks yet — the FY is open."
              showDensityToggle={false}
              zebra
            />
          </>
        )}
      </div>
    </PageLayout>
  );
}

export default YearEndClosePage;
