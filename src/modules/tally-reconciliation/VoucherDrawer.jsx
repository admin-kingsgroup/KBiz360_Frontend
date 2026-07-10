import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { getLedgerVouchers } from './api';
import { fmt, grp, statusMeta } from './format';
import { Badge, LoadingState, ErrorState } from '../../shell/primitives';

// ─── Voucher drill (Phase 2) — one off ledger, voucher-by-voucher ────────────
// Opens from an off row on the tie-out board: the ledger's ERP postings vs its
// uploaded Tally Day Book, matched line-by-line, with the residue flagged. This
// is the "why is this ledger off?" view. Needs the Day Book imported (the
// per-ledger Tally Ledger Matcher) — else it says so plainly.

export function VoucherDrawer({ branch, period, tier, ledger, cur, onClose }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tally-tieout', 'ledger', branch, period, tier, ledger],
    queryFn: () => getLedgerVouchers({ branch, period, tier, ledger }),
    enabled: !!ledger,
  });
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const lines = data?.lines || [];
  const summary = data?.summary || { total: 0 };
  const noDayBook = !isLoading && !isError && (data?.tallyImported === 0);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/45" onClick={onClose} aria-hidden="true" />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-[min(620px,96vw)] flex-col bg-surface shadow-pop" role="dialog" aria-label={`Vouchers for ${ledger}`}>
        <div className="flex items-start gap-3 border-b border-surface-border px-5 py-4">
          <div className="min-w-0">
            <h4 className="truncate text-base font-bold text-ink">{ledger}</h4>
            <p className="text-xs text-ink-subtle">Voucher-by-voucher · ERP ↔ Tally Day Book · {period}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="ml-auto grid h-8 w-8 place-items-center rounded-brand border border-surface-border text-ink-muted hover:border-danger hover:text-danger">
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
              No Tally <b>Day Book</b> imported for this ledger yet — import it in the <b>Tally Ledger Matcher</b> to drill to the voucher that's off. The balance gap is still shown in the Defect Register.
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
      </aside>
    </>
  );
}
