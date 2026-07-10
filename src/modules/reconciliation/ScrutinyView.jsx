import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, AlertTriangle, SearchCheck, RefreshCcw, ClipboardCopy } from 'lucide-react';
import { scrutinyEntryAction, scrutinyBulkAction, rerunScrutiny } from './api';
import { fmtAmt, classifyOptionsFor, classificationLabel, MATCH_TYPE_LABELS } from './utils';
import { Drawer, Badge, Button, Select, Checkbox } from '../../shell/primitives';

// ─── Statement Scrutiny — entry-to-entry report (v2) ─────────────────────────
// v2 adds: bulk classify (select-all in one write), auto-SUGGESTED classifications
// (staff mostly confirm), Re-run match (after posting a missing charge — no
// re-upload), carry-forward badges (an item is explained once, then carries
// until it clears), rate-difference deltas on ref-matches, learned/TDS chips,
// and supplier-vocabulary classifications on party (SOA) scrutinies.

const STATUS = {
  matched: { tone: 'success', label: 'Matched' },
  probable: { tone: 'warning', label: 'Probable' },
  'stmt-only': { tone: 'info', label: 'Statement-only' },
  'book-only': { tone: 'danger', label: 'Book-only' },
};

function Cell({ children, className = '' }) {
  return <td className={`border-b border-surface-border px-2.5 py-2 align-top text-xs ${className}`}>{children}</td>;
}

export function ScrutinyView({ cert, onClose, setRoute }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(() => new Set());
  const [bulkClass, setBulkClass] = useState('');
  const [err, setErr] = useState('');
  const s = cert.scrutiny;

  const onDone = () => { setErr(''); setSelected(new Set()); qc.invalidateQueries({ queryKey: ['recon-certs'] }); };
  const act = useMutation({
    mutationFn: ({ entryId, action, classification }) => scrutinyEntryAction(cert._id, entryId, { action, classification }),
    onSuccess: onDone, onError: (e) => setErr(e.message),
  });
  const bulk = useMutation({
    mutationFn: (body) => scrutinyBulkAction(cert._id, body),
    onSuccess: onDone, onError: (e) => setErr(e.message),
  });
  const rerun = useMutation({
    mutationFn: () => rerunScrutiny(cert._id),
    onSuccess: onDone, onError: (e) => setErr(e.message),
  });

  if (!s) return null;
  const sum = s.summary || {};
  const classify = classifyOptionsFor(s.perspective);
  const entries = (s.entries || []).filter((e) => filter === 'all'
    || (filter === 'open' ? (e.status === 'probable' || ((e.status === 'stmt-only' || e.status === 'book-only') && !e.classification)) : e.status === filter));
  // Edits allowed until SIGNING starts (matches the backend guard) — staff
  // can still reclassify and re-freeze between freeze and the first signature.
  const frozen = (cert.signatures?.length || 0) > 0;
  const actionable = (e) => e.status === 'probable' || ((e.status === 'stmt-only' || e.status === 'book-only') && !e.classification);
  const selectable = entries.filter(actionable);
  // Selection never outlives its filter — a bulk action must only ever hit
  // lines the user can SEE when they press Apply.
  const pickFilter = (k) => { setFilter(k); setSelected(new Set()); };
  const allSelected = selectable.length > 0 && selectable.every((e) => selected.has(e._id));
  const toggle = (id) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(selectable.map((e) => e._id)));

  // "Copy → open voucher entry": stmt-only lines that need posting jump the user
  // into voucher entry with the line's details on the clipboard (2b-lite).
  const copyAndJump = async (e) => {
    const line = e.stmt || e.book || {};
    try { await navigator.clipboard.writeText(`${line.date} · ${line.description || line.particulars || ''} · ${line.reference || ''} · ${line.amount}`); } catch { /* clipboard optional */ }
    if (setRoute) setRoute(s.perspective === 'party' ? '/finance/adm-voucher' : '/transactions/voucher-tabs');
  };

  return (
    <Drawer open onClose={onClose} width="xl"
      title={`Statement Scrutiny — ${cert.ledger.name}`}
      subtitle={`${s.fileName || 'parsed statement'} · ${s.perspective === 'party' ? 'supplier/client SOA' : 'bank statement'} · window ${s.window?.from} → ${s.window?.to}`}
      footer={(
        <div className="flex w-full flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-ink-muted">
            Suggested adjustments from classified items:{' '}
            <b className="tabular-nums text-ink">{fmtAmt(sum.suggestedAdjustments ?? 0, cert.branch)}</b>
            {sum.unresolved > 0 && <Badge tone="warning" size="sm" className="ml-2">{sum.unresolved} unresolved</Badge>}
            {sum.carriedOpen > 0 && <Badge tone="neutral" size="sm" className="ml-2">{sum.carriedOpen} carried forward</Badge>}
          </span>
          <span className="text-xs text-ink-subtle">{frozen ? 'Signing has started — the scrutiny is read-only.' : 'Adopt these from the snapshot form ("Use scrutiny figures") — you can reclassify and re-freeze until the first signature.'}</span>
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

        {/* filter + rerun */}
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Scrutiny filter">
          {[['all', 'All'], ['open', 'Needs action'], ['matched', 'Matched'], ['probable', 'Probable'], ['stmt-only', 'Statement-only'], ['book-only', 'Book-only']].map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => pickFilter(k)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${filter === k ? 'border-transparent bg-navy text-white' : 'border-surface-border bg-surface text-ink-muted hover:border-ink/20'}`}>
              {l}
            </button>
          ))}
          <span className="ml-auto flex items-center gap-2">
            {err ? <span className="text-xs text-danger">{err}</span> : null}
            {!frozen && (
              <Button size="xs" variant="ghost" icon={RefreshCcw} loading={rerun.isPending} onClick={() => rerun.mutate()}
                title="Re-match the stored statement against the CURRENT books — use after posting a missing charge.">
                Re-run match
              </Button>
            )}
          </span>
        </div>

        {/* bulk bar */}
        {!frozen && selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-brand border border-info/30 bg-info-soft/40 px-3 py-2 text-sm">
            <b className="tabular-nums">{selected.size} line(s) selected</b>
            <Select aria-label="Bulk classification" value={bulkClass} onChange={(e) => setBulkClass(e.target.value)}>
              <option value="">Classify selected as…</option>
              {classify.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
            <Button size="xs" variant="primary" loading={bulk.isPending} disabled={!bulkClass}
              onClick={() => bulk.mutate({ entryIds: [...selected], action: 'classify', classification: bulkClass })}>
              Apply
            </Button>
            <Button size="xs" variant="secondary" loading={bulk.isPending}
              onClick={() => bulk.mutate({ entryIds: [...selected], action: 'confirm' })}
              title="Confirms every selected PROBABLE match (others are skipped).">
              Confirm probables
            </Button>
            <Button size="xs" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        )}

        {/* entry table */}
        <div className="overflow-x-auto rounded-brand border border-surface-border">
          <table className="w-full min-w-[880px] border-collapse">
            <thead>
              <tr className="bg-surface-alt text-left text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                <th className="border-b border-surface-border px-2 py-2">
                  {!frozen && selectable.length > 0 && (
                    <Checkbox aria-label="Select all actionable" checked={allSelected} onChange={toggleAll} />
                  )}
                </th>
                <th className="border-b border-surface-border px-2.5 py-2" colSpan={2}>Statement</th>
                <th className="border-b border-surface-border px-2.5 py-2 text-center">Match</th>
                <th className="border-b border-surface-border px-2.5 py-2" colSpan={2}>Books (ERP ledger)</th>
                <th className="border-b border-surface-border px-2.5 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const meta = STATUS[e.status] || STATUS.matched;
                const typeChip = MATCH_TYPE_LABELS[e.matchType];
                return (
                  <tr key={e._id} className={e.carriedFrom ? 'bg-surface-alt/40' : undefined}>
                    <Cell>
                      {!frozen && actionable(e) && (
                        <Checkbox aria-label="Select line" checked={selected.has(e._id)} onChange={() => toggle(e._id)} />
                      )}
                    </Cell>
                    <Cell className="max-w-[210px]">
                      {e.stmt ? (<>
                        <div className="font-medium text-ink">{e.stmt.date} <span className="text-ink-muted">{e.stmt.description}</span></div>
                        {e.stmt.reference ? <div className="font-mono text-[10.5px] text-ink-subtle">{e.stmt.reference}</div> : null}
                      </>) : <span className="italic text-ink-subtle">— not on statement —</span>}
                    </Cell>
                    <Cell className="whitespace-nowrap text-right font-semibold tabular-nums">{e.stmt ? fmtAmt(e.stmt.amount, cert.branch) : ''}</Cell>
                    <Cell className="text-center">
                      <Badge tone={meta.tone} size="sm" dot>{meta.label}</Badge>
                      {typeChip ? <div className="mt-0.5 text-[10px] font-semibold text-ink-muted" title={e.delta ? 'Δ = statement − books' : undefined}>{typeChip}{e.delta ? ` · Δ ${fmtAmt(e.delta, cert.branch)}` : ''}</div>
                        : (e.matchType && e.matchType !== '1:1' ? <div className="mt-0.5 text-[10px] text-ink-subtle">{e.matchType}</div> : null)}
                      {e.carriedFrom ? <div className="mt-0.5 text-[10px] font-semibold text-ink-subtle">carried from {e.carriedFrom}</div> : null}
                      {e.classification ? <div className="mt-0.5 text-[10px] font-semibold text-ink-muted">{classificationLabel(e.classification)}</div> : null}
                    </Cell>
                    <Cell className="max-w-[210px] border-l border-surface-border">
                      {e.book ? (<>
                        <div className="font-medium text-ink">{e.book.date} <span className="text-ink-muted">{e.book.particulars}</span></div>
                        <div className="font-mono text-[10.5px] text-ink-subtle">{e.book.vno}{e.bookGroup?.length > 1 ? ` +${e.bookGroup.length - 1} more` : ''}</div>
                      </>) : <span className="italic text-ink-subtle">— missing in ERP —</span>}
                    </Cell>
                    <Cell className="whitespace-nowrap text-right font-semibold tabular-nums">{e.book ? fmtAmt(e.book.amount, cert.branch) : ''}</Cell>
                    <Cell>
                      {frozen ? <span className="text-[10.5px] text-ink-subtle">signed</span> : e.status === 'probable' ? (
                        <Button size="xs" variant="primary" icon={CheckCircle2} loading={act.isPending && act.variables?.entryId === e._id}
                          onClick={() => act.mutate({ entryId: e._id, action: 'confirm' })}>Confirm</Button>
                      ) : (e.status === 'stmt-only' || e.status === 'book-only') ? (
                        e.classification ? (
                          <span className="flex items-center gap-1">
                            <Button size="xs" variant="ghost" onClick={() => act.mutate({ entryId: e._id, action: 'unclassify' })}>Unclassify</Button>
                            {(e.classification === 'to-post' || e.classification === 'credit-note-pending') && (
                              <Button size="xs" variant="ghost" icon={ClipboardCopy} title="Copy the line and open voucher entry"
                                onClick={() => copyAndJump(e)}>Post</Button>
                            )}
                          </span>
                        ) : (
                          <span className="flex flex-col items-start gap-1">
                            {e.suggested && (
                              <Button size="xs" variant="secondary" loading={act.isPending && act.variables?.entryId === e._id}
                                title="Apply the suggested classification"
                                onClick={() => act.mutate({ entryId: e._id, action: 'classify', classification: e.suggested })}>
                                ✓ {classificationLabel(e.suggested)}
                              </Button>
                            )}
                            <Select aria-label="Classify reconciling item" defaultValue=""
                              onChange={(ev) => ev.target.value && act.mutate({ entryId: e._id, action: 'classify', classification: ev.target.value })}>
                              <option value="" disabled>{e.suggested ? 'or classify as…' : 'Classify…'}</option>
                              {classify.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </Select>
                          </span>
                        )
                      ) : <span className="text-[10.5px] text-ink-subtle">auto</span>}
                    </Cell>
                  </tr>
                );
              })}
              {entries.length === 0 && (
                <tr><Cell className="py-6 text-center text-ink-subtle" colSpan={7}>Nothing in this filter.</Cell></tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="flex items-center gap-2 text-xs text-ink-subtle">
          <AlertTriangle size={13} aria-hidden="true" />
          Every line must be Matched or Classified. Confirming a probable also TEACHES the matcher — the same pattern pairs automatically next period, and classified items carry forward until they clear.
        </p>
      </div>
    </Drawer>
  );
}

export const ScrutinyIcon = SearchCheck;
