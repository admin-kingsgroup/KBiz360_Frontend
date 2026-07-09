import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, AlertTriangle, SearchCheck } from 'lucide-react';
import { scrutinyEntryAction } from './api';
import { fmtAmt } from './utils';
import { Drawer, Badge, Button, Select } from '../../shell/primitives';

// ─── Statement Scrutiny — entry-to-entry report ─────────────────────────────
// Opens over the certificate drawer: every statement line vs every book entry
// in the period window, in four buckets. Probable matches confirm with one
// click; unmatched lines classify as reconciling items — and the classified
// set drives the SUGGESTED adjustments the snapshot form can adopt.

const STATUS = {
  matched: { tone: 'success', label: 'Matched' },
  probable: { tone: 'warning', label: 'Probable' },
  'stmt-only': { tone: 'info', label: 'Statement-only' },
  'book-only': { tone: 'danger', label: 'Book-only' },
};
const CLASSIFY = [
  { value: 'unpresented', label: 'Unpresented cheque' },
  { value: 'in-transit', label: 'Deposit in transit' },
  { value: 'to-post', label: 'Charge/credit to post' },
  { value: 'other', label: 'Other reconciling item' },
];

function Cell({ children, className = '' }) {
  return <td className={`border-b border-surface-border px-2.5 py-2 align-top text-xs ${className}`}>{children}</td>;
}

export function ScrutinyView({ cert, onClose }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [err, setErr] = useState('');
  const s = cert.scrutiny;
  const act = useMutation({
    mutationFn: ({ entryId, action, classification }) => scrutinyEntryAction(cert._id, entryId, { action, classification }),
    onSuccess: () => { setErr(''); qc.invalidateQueries({ queryKey: ['recon-certs'] }); },
    onError: (e) => setErr(e.message),
  });
  if (!s) return null;
  const sum = s.summary || {};
  const entries = (s.entries || []).filter((e) => filter === 'all'
    || (filter === 'open' ? (e.status === 'probable' || ((e.status === 'stmt-only' || e.status === 'book-only') && !e.classification)) : e.status === filter));
  const frozen = !!cert.snapshot?.frozenAt;

  return (
    <Drawer open onClose={onClose} width="xl"
      title={`Statement Scrutiny — ${cert.ledger.name}`}
      subtitle={`${s.fileName || 'parsed statement'} · window ${s.window?.from} → ${s.window?.to} · generated ${s.generatedAt ? new Date(s.generatedAt).toLocaleString() : ''}`}
      footer={(
        <div className="flex w-full flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-ink-muted">
            Suggested adjustments from classified items:{' '}
            <b className="tabular-nums text-ink">{fmtAmt(sum.suggestedAdjustments ?? 0, cert.branch)}</b>
            {sum.unresolved > 0 && <Badge tone="warning" size="sm" className="ml-2">{sum.unresolved} unresolved</Badge>}
          </span>
          <span className="text-xs text-ink-subtle">{frozen ? 'Snapshot already frozen — re-freeze is blocked once signing starts.' : 'Use these figures from the snapshot form (“Use scrutiny figures”).'}</span>
        </div>
      )}>
      <div className="grid gap-4 p-4">

        {/* summary strip */}
        <div className="grid grid-cols-3 gap-2 tablet:grid-cols-6">
          {[
            ['Statement lines', sum.stmtLines, 'text-ink'],
            ['Book entries', sum.bookEntries, 'text-ink'],
            ['Matched', sum.matched, 'text-success'],
            ['Probable', sum.probable, 'text-warning'],
            ['Statement-only', sum.stmtOnly, 'text-info'],
            ['Book-only', sum.bookOnly, 'text-danger'],
          ].map(([l, v, cls]) => (
            <div key={l} className="rounded-brand border border-surface-border bg-surface px-3 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-subtle">{l}</div>
              <div className={`text-lg font-extrabold tabular-nums ${cls}`}>{v ?? 0}</div>
            </div>
          ))}
        </div>

        {/* filter */}
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Scrutiny filter">
          {[['all', 'All'], ['open', 'Needs action'], ['matched', 'Matched'], ['probable', 'Probable'], ['stmt-only', 'Statement-only'], ['book-only', 'Book-only']].map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${filter === k ? 'border-transparent bg-navy text-white' : 'border-surface-border bg-surface text-ink-muted hover:border-ink/20'}`}>
              {l}
            </button>
          ))}
          {err ? <span className="ml-auto text-xs text-danger">{err}</span> : null}
        </div>

        {/* entry table */}
        <div className="overflow-x-auto rounded-brand border border-surface-border">
          <table className="w-full min-w-[840px] border-collapse">
            <thead>
              <tr className="bg-surface-alt text-left text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                <th className="border-b border-surface-border px-2.5 py-2" colSpan={2}>Statement</th>
                <th className="border-b border-surface-border px-2.5 py-2 text-center">Match</th>
                <th className="border-b border-surface-border px-2.5 py-2" colSpan={2}>Books (ERP ledger)</th>
                <th className="border-b border-surface-border px-2.5 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const meta = STATUS[e.status] || STATUS.matched;
                return (
                  <tr key={e._id}>
                    <Cell className="max-w-[220px]">
                      {e.stmt ? (<>
                        <div className="font-medium text-ink">{e.stmt.date} <span className="text-ink-muted">{e.stmt.description}</span></div>
                        {e.stmt.reference ? <div className="font-mono text-[10.5px] text-ink-subtle">{e.stmt.reference}</div> : null}
                      </>) : <span className="italic text-ink-subtle">— not on statement —</span>}
                    </Cell>
                    <Cell className="whitespace-nowrap text-right font-semibold tabular-nums">{e.stmt ? fmtAmt(e.stmt.amount, cert.branch) : ''}</Cell>
                    <Cell className="text-center">
                      <Badge tone={meta.tone} size="sm" dot>{meta.label}</Badge>
                      {e.matchType === '1:1' || !e.matchType ? null : <div className="mt-0.5 text-[10px] text-ink-subtle">{e.matchType}</div>}
                      {e.classification ? <div className="mt-0.5 text-[10px] font-semibold text-ink-muted">{CLASSIFY.find((c) => c.value === e.classification)?.label}</div> : null}
                    </Cell>
                    <Cell className="max-w-[220px] border-l border-surface-border">
                      {e.book ? (<>
                        <div className="font-medium text-ink">{e.book.date} <span className="text-ink-muted">{e.book.particulars}</span></div>
                        <div className="font-mono text-[10.5px] text-ink-subtle">{e.book.vno}{e.bookGroup?.length > 1 ? ` +${e.bookGroup.length - 1} more` : ''}</div>
                      </>) : <span className="italic text-ink-subtle">— missing in ERP —</span>}
                    </Cell>
                    <Cell className="whitespace-nowrap text-right font-semibold tabular-nums">{e.book ? fmtAmt(e.book.amount, cert.branch) : ''}</Cell>
                    <Cell>
                      {frozen ? <span className="text-[10.5px] text-ink-subtle">frozen</span> : e.status === 'probable' ? (
                        <Button size="xs" variant="primary" icon={CheckCircle2} loading={act.isPending && act.variables?.entryId === e._id}
                          onClick={() => act.mutate({ entryId: e._id, action: 'confirm' })}>Confirm</Button>
                      ) : (e.status === 'stmt-only' || e.status === 'book-only') ? (
                        e.classification ? (
                          <Button size="xs" variant="ghost" onClick={() => act.mutate({ entryId: e._id, action: 'unclassify' })}>Unclassify</Button>
                        ) : (
                          <Select aria-label="Classify reconciling item" defaultValue=""
                            onChange={(ev) => ev.target.value && act.mutate({ entryId: e._id, action: 'classify', classification: ev.target.value })}>
                            <option value="" disabled>Classify…</option>
                            {CLASSIFY.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                          </Select>
                        )
                      ) : <span className="text-[10.5px] text-ink-subtle">auto</span>}
                    </Cell>
                  </tr>
                );
              })}
              {entries.length === 0 && (
                <tr><Cell className="py-6 text-center text-ink-subtle" colSpan={6}>Nothing in this filter.</Cell></tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="flex items-center gap-2 text-xs text-ink-subtle">
          <AlertTriangle size={13} aria-hidden="true" />
          Every line must be Matched or Classified before the difference truly explains itself — the suggested adjustments only count classified items.
        </p>
      </div>
    </Drawer>
  );
}

export const ScrutinyIcon = SearchCheck;
