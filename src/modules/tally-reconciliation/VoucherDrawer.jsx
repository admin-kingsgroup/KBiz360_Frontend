import React, { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Check, RotateCcw, ArrowLeft } from 'lucide-react';
import { getLedgerVouchers, acceptVariance, clearVariance } from './api';
import { fmt, statusMeta, REASONS, reasonLabel } from './format';
import { Badge, Button, Select, LoadingState, ErrorState } from '../../shell/primitives';

// The full ERP voucher (all legs + header), opened on demand from a drill line. Lazy so the heavy
// accounting module (legacy.jsx) is code-split out of the tally bundle until a voucher is opened.
const VoucherEditor = lazy(() => import('../accountingLive/legacy').then((m) => ({ default: m.VoucherEditor })));

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
  const [expanded, setExpanded] = useState(null);   // which voucher row is expanded to its entries
  const [openVoucher, setOpenVoucher] = useState(null);   // { id, vno } — the full voucher opened over the drill

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tally-tieout', 'ledger', branch, period, tier, ledger],
    queryFn: () => getLedgerVouchers({ branch, period, tier, ledger }),
    enabled: !!ledger,
  });
  const closeRef = useRef(null);
  useEffect(() => { closeRef.current?.focus(); }, []); // move focus into the dialog on open (a11y)
  useEffect(() => {
    // Modal stack: Escape pops the full-voucher overlay first, then the drill drawer.
    const onKey = (e) => { if (e.key === 'Escape') { if (openVoucher) setOpenVoucher(null); else onClose(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, openVoucher]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['tally-tieout'] });
  const accept = useMutation({ mutationFn: () => acceptVariance({ branch, period, tier, ledger, reason, note }), onSuccess: () => { invalidate(); onClose(); } });
  const unaccept = useMutation({ mutationFn: () => clearVariance({ branch, period, tier, ledger }), onSuccess: () => { invalidate(); onClose(); } });

  const lines = data?.lines || [];
  const summary = data?.summary || { total: 0 };
  const noDayBook = !isLoading && !isError && (data?.tallyImported === 0);
  const ready = !isLoading && !isError && !!data;   // header numbers are only meaningful once the drill loaded

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
            <div className="font-mono text-sm font-bold tabular-nums">{ready ? fmt(data?.erpBalance ?? null, cur) : '—'}</div>
          </div>
          <div className="flex-1 px-5 py-3 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">Defects</div>
            <div className={`text-sm font-bold tabular-nums ${!ready ? 'text-ink-subtle' : summary.total > 0 ? 'text-danger' : 'text-success'}`}>{ready ? summary.total : '—'}</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading && <LoadingState label="Matching vouchers…" />}
          {isError && <ErrorState title="Couldn’t load the vouchers" message="The service didn’t respond." onRetry={() => refetch()} />}
          {/* A missing Tally Day Book must NOT hide the ERP vouchers — those are the ERP side you're
              verifying. Show a SOFT note above the list when there ARE ERP vouchers; the full empty
              state only when there are none at all. */}
          {!isLoading && !isError && noDayBook && lines.length > 0 && (
            <div className="m-5 mb-0 rounded-brand border border-warning/40 bg-warning/10 px-4 py-2.5 text-[13px] text-ink">
              No Tally <b>Day Book</b> for this ledger this period — showing <b>ERP vouchers only</b> (Tally column blank). Import it in the{' '}
              <button type="button" onClick={() => { onClose(); setRoute && setRoute('/accounts/tally-reco'); }}
                className="font-semibold text-accent underline underline-offset-2 hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-accent rounded">
                Ledger Matcher (Day Book)
              </button>{' '}to match voucher-by-voucher.
            </div>
          )}
          {!isLoading && !isError && lines.length === 0 && (
            <div className="m-5 rounded-brand border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-ink">
              {noDayBook ? (<>No Tally <b>Day Book</b> imported and no ERP vouchers for this ledger this period — import it in the{' '}
                <button type="button" onClick={() => { onClose(); setRoute && setRoute('/accounts/tally-reco'); }}
                  className="font-semibold text-accent underline underline-offset-2 hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-accent rounded">
                  Ledger Matcher (Day Book)
                </button>{' '}to drill to the voucher that's off. You can still <b>accept</b> the balance gap below when it's an explained (e.g. inter-branch) difference.</>)
                : 'No vouchers to show for this ledger this period.'}
            </div>
          )}
          {!isLoading && !isError && lines.length > 0 && (
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
                  const label = l.party || l.desc || '—';
                  const legs = Array.isArray(l.particulars) ? l.particulars : [];
                  const canExpand = legs.length > 0;
                  const open = expanded === i;
                  const toggle = () => setExpanded(open ? null : i);
                  return (
                    <React.Fragment key={i}>
                      <tr className={`border-b border-surface-border ${meta.tone === 'danger' ? 'bg-danger/5' : meta.tone === 'warning' ? 'bg-warning/5' : ''} ${canExpand ? 'cursor-pointer hover:bg-surface-alt/60 focus:bg-surface-alt/60 focus:outline-none focus:ring-2 focus:ring-accent' : ''}`}
                        onClick={canExpand ? toggle : undefined}
                        role={canExpand ? 'button' : undefined} tabIndex={canExpand ? 0 : undefined}
                        aria-expanded={canExpand ? open : undefined}
                        onKeyDown={canExpand ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } } : undefined}>
                        <td className="px-4 py-2 align-top">
                          <span className="block font-semibold text-ink">{canExpand ? <span className="mr-1 inline-block text-ink-subtle">{open ? '▾' : '▸'}</span> : null}{label}
                            {l.vtype ? <span className="ml-1.5 align-middle rounded bg-surface-alt px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted">{l.vtype}</span> : null}</span>
                          <span className="mt-0.5 block font-mono text-xs text-ink-subtle">{l.voucherId
                            ? <button type="button" title="Open the full voucher" onClick={(e) => { e.stopPropagation(); setOpenVoucher({ id: l.voucherId, vno: l.ref }); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); }} className="rounded font-semibold text-accent hover:underline focus:outline-none focus:ring-1 focus:ring-accent">{l.ref || 'voucher'} ↗</button>
                            : (l.ref || '(no vno)')}{l.tallyRef && l.tallyRef !== l.ref ? ` · Tally ${l.tallyRef}` : ''}{l.date ? ` · ${l.date}` : ''}{l.sourceRef ? ` · ${l.sourceRef}` : ''}</span>
                          {l.narration && l.narration !== l.desc ? <span className="mt-0.5 block text-[11px] text-ink-muted">{l.narration}</span> : null}
                          {l.desc && l.desc !== label ? <span className="mt-0.5 block text-[11px] text-ink-subtle">{l.desc}</span> : null}
                          {canExpand ? <span className="mt-0.5 block text-[10.5px] font-semibold text-accent">{open ? '▾ hide entries' : `▸ ${legs.length} ${legs.length === 1 ? 'entry' : 'entries'}`}</span> : null}
                        </td>
                        <td className={`px-4 py-2 text-right align-top font-mono tabular-nums ${l.erp === null ? 'text-ink-subtle' : ''}`}>{fmt(l.erp, cur)}</td>
                        <td className={`px-4 py-2 text-right align-top font-mono tabular-nums ${l.tally === null ? 'text-ink-subtle' : ''}`}>{fmt(l.tally, cur)}</td>
                        <td className="px-4 py-2 text-right align-top"><Badge tone={meta.tone} size="sm" dot>{meta.label}</Badge></td>
                      </tr>
                      {open && canExpand ? (
                        <tr className="border-b border-surface-border bg-surface-sunk/60">
                          <td colSpan={4} className="px-4 py-2 pl-8">
                            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">Entries in this voucher</div>
                            <div className="grid gap-0.5">
                              {legs.map((p, j) => (
                                <div key={j} className="flex items-center justify-between gap-3 text-xs">
                                  <span className="truncate text-ink">↳ {p.ledger}</span>
                                  <span className="shrink-0 font-mono tabular-nums text-ink-muted">{fmt(p.side === 'Cr' ? -Math.abs(p.amount) : Math.abs(p.amount), cur)}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
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
                <Button variant="secondary" icon={Check} loading={accept.isPending} disabled={isError} title={isError ? 'Load the drill before accepting' : undefined} onClick={() => accept.mutate()}>Accept variance</Button>
              </div>
              {accept.isError && <span className="text-xs text-danger">{accept.error?.message}</span>}
              <span className="text-xs text-ink-subtle">Use for permanent explained gaps (inter-branch, timing, FX rounding). The real difference stays visible — it just stops blocking the close.</span>
            </div>
          )}
        </div>
      </aside>

      {/* Full ERP voucher, opened from a drill line's number — all legs + header, over the drill.
          Read-only for posted vouchers (VoucherShell's viewOnly), role-gated otherwise. */}
      {openVoucher && (
        <div className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-surface" role="dialog" aria-modal="true" aria-label={`Voucher ${openVoucher.vno || ''}`}>
          <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-surface-border bg-surface px-5 py-3">
            <button type="button" onClick={() => setOpenVoucher(null)}
              className="inline-flex items-center gap-1.5 rounded-brand border border-surface-border px-3 py-1.5 text-sm font-semibold text-ink-muted hover:border-accent hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent">
              <ArrowLeft size={15} /> Back to drill
            </button>
            <span className="truncate text-sm font-semibold text-ink">Voucher {openVoucher.vno || ''}</span>
          </div>
          <div className="flex-1">
            <Suspense fallback={<div className="p-8 text-center text-sm text-ink-subtle">Loading voucher…</div>}>
              <VoucherEditor voucherId={openVoucher.id} cur={cur} onBack={() => setOpenVoucher(null)} onClose={() => setOpenVoucher(null)} />
            </Suspense>
          </div>
        </div>
      )}
    </>
  );
}
