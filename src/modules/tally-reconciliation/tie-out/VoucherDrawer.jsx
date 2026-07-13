import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Check, RotateCcw } from 'lucide-react';
import { getLedgerVouchers, acceptVariance, clearVariance } from '../api';
import { fmt, statusMeta, REASONS, reasonLabel } from '../format';
import { Badge, Button, Select, LoadingState, ErrorState } from '../../../shell/primitives';

// ─── Voucher drill (Phase 2) + accept-variance (Phase 4) ─────────────────────
// Opens from an off row: the ledger's ERP postings vs its uploaded Tally Day
// Book, matched voucher-by-voucher. When a difference is EXPECTED (inter-branch —
// reconciled by hand — timing, FX rounding), accept it with a reason so it stops
// blocking the certificate. The real difference is still shown; nothing is hidden.

export function VoucherDrawer({ branch, period, tier, row, cur, setRoute, onClose }) {
  const ledger = typeof row === 'string' ? row : (row && row.ledger);
  const rowStatus = row && row.status;
  const accepted = rowStatus === 'accepted';
  const qc = useQueryClient();
  const [reason, setReason] = useState(row && row.interBranch ? 'inter-branch' : 'timing');
  const [note, setNote] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tally-tieout', 'ledger', branch, period, tier, ledger],
    queryFn: () => getLedgerVouchers({ branch, period, tier, ledger }),
    enabled: !!ledger,
  });
  const closeRef = useRef(null);
  useEffect(() => { closeRef.current?.focus(); }, []); // move focus into the dialog on open (a11y)
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['tally-tieout'] });
  const accept = useMutation({ mutationFn: () => acceptVariance({ branch, period, tier, ledger, reason, note }), onSuccess: () => { invalidate(); onClose(); } });
  const unaccept = useMutation({ mutationFn: () => clearVariance({ branch, period, tier, ledger }), onSuccess: () => { invalidate(); onClose(); } });

  const lines = data?.lines || [];
  const summary = data?.summary || { total: 0 };
  const noDayBook = !isLoading && !isError && (data?.tallyImported === 0);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/45" onClick={onClose} aria-hidden="true" />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-[min(620px,96vw)] flex-col bg-surface shadow-pop" role="dialog" aria-modal="true" aria-label={`Vouchers for ${ledger}`}>
        <div className="flex items-start gap-3 border-b border-surface-border px-5 py-4">
          <div className="min-w-0">
            <h4 className="truncate text-base font-bold text-ink">{ledger}
              {row && row.interBranch ? <span className="ml-2 align-middle rounded-full bg-info/10 px-2 py-0.5 text-[10.5px] font-semibold text-info">inter-branch</span> : null}</h4>
            <p className="text-xs text-ink-subtle">Voucher-by-voucher · ERP ↔ Tally Day Book · {period}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close"
            className="ml-auto grid h-8 w-8 place-items-center rounded-brand border border-surface-border text-ink-muted hover:border-danger hover:text-danger focus:outline-none focus:ring-2 focus:ring-accent">
            <X size={16} />
          </button>
        </div>

        {/* balances */}
        <div className="flex border-b border-surface-border">
          <div className="flex-1 border-r border-surface-border px-5 py-3 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">ERP balance</div>
            <div className="font-mono text-sm font-bold tabular-nums">{fmt(data?.erpBalance ?? null, cur)}</div>
          </div>
          <div className="flex-1 px-5 py-3 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">Defects</div>
            <div className={`text-sm font-bold tabular-nums ${summary.total > 0 ? 'text-danger' : 'text-success'}`}>{summary.total}</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading && <LoadingState label="Matching vouchers…" />}
          {isError && <ErrorState title="Couldn’t load the vouchers" message="The service didn’t respond." onRetry={() => refetch()} />}
          {noDayBook && (
            <div className="m-5 rounded-brand border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-ink">
              No Tally <b>Day Book</b> imported for this ledger yet — import it in the{' '}
              <button type="button" onClick={() => { onClose(); setRoute && setRoute('/accounts/tally-reco'); }}
                className="font-semibold text-accent underline underline-offset-2 hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-accent rounded">
                Ledger Matcher (Day Book)
              </button>{' '}to drill to the voucher that's off. You can still <b>accept</b> the balance gap below when it's an explained (e.g. inter-branch) difference.
            </div>
          )}
          {!isLoading && !noDayBook && lines.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-ink-subtle">
                  <th className="px-4 py-2 text-left font-bold">Voucher</th>
                  <th className="px-4 py-2 text-right font-bold">ERP</th>
                  <th className="px-4 py-2 text-right font-bold">Tally</th>
                  <th className="px-4 py-2 text-right font-bold">Match</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => {
                  const meta = statusMeta(l.status);
                  return (
                    <tr key={i} className={`border-b border-surface-border ${l.status === 'matched' ? '' : 'bg-danger/5'}`}>
                      <td className="px-4 py-2">
                        <span className="block font-semibold text-ink">{l.desc || '—'}</span>
                        <span className="font-mono text-xs text-ink-subtle">{l.date}{l.ref ? ` · ${l.ref}` : ''}</span>
                      </td>
                      <td className={`px-4 py-2 text-right font-mono tabular-nums ${l.erp === null ? 'text-ink-subtle' : ''}`}>{fmt(l.erp, cur)}</td>
                      <td className={`px-4 py-2 text-right font-mono tabular-nums ${l.tally === null ? 'text-ink-subtle' : ''}`}>{fmt(l.tally, cur)}</td>
                      <td className="px-4 py-2 text-right"><Badge tone={meta.tone} size="sm" dot>{meta.label}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* accept-variance footer (Phase 4) */}
        <div className="border-t border-surface-border bg-surface-sunk px-5 py-4">
          {accepted ? (
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="info" size="sm" dot>Accepted</Badge>
              <span className="text-sm text-ink">Explained as <b>{reasonLabel(row.acceptedReason)}</b>{row.acceptedNote ? ` — ${row.acceptedNote}` : ''}. It no longer blocks the certificate.</span>
              <Button variant="ghost" icon={RotateCcw} loading={unaccept.isPending} onClick={() => unaccept.mutate()}>Remove acceptance</Button>
              {unaccept.isError && <span className="text-xs text-danger">{unaccept.error?.message}</span>}
            </div>
          ) : (
            <div className="grid gap-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Accept this difference as explained</div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reason">
                  {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </Select>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)"
                  className="min-w-0 flex-1 rounded-brand border border-surface-border bg-surface px-3 py-1.5 text-sm text-ink" />
                <Button variant="secondary" icon={Check} loading={accept.isPending} onClick={() => accept.mutate()}>Accept variance</Button>
              </div>
              {accept.isError && <span className="text-xs text-danger">{accept.error?.message}</span>}
              <span className="text-xs text-ink-subtle">Use for permanent explained gaps (inter-branch, timing, FX rounding). The real difference stays visible — it just stops blocking the close.</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
