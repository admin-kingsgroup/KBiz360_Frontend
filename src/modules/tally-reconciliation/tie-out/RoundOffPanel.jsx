import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Scale, RotateCcw, CheckCircle2 } from 'lucide-react';
import { previewRoundOff, settleRoundOff, reverseRoundOff } from '../api';
import { isSettlerRole, fmt } from '../format';
import { invalidateBooks } from '../../../core/useAccounting';
import { PageSection, Badge, Button } from '../../../shell/primitives';

// ─── Rounding settlement (Phase 4) ───────────────────────────────────────────
// ERP and Tally both round, but not always on the same voucher — Tally snaps some
// invoice totals to the whole rupee where ERP keeps exact paise, and elsewhere the
// reverse. What's left is sub-rupee per-ledger residue that nets to ZERO.
//
// This is NOT an accept-variance switch. Nothing is waved through: a real, dated,
// reversible JV moves ERP onto Tally, after which the rows tie on their own merit
// and certify normally. The preview is always shown before the commit, because the
// consequence is not obvious — a PARTIAL sweep plugs its remainder to Round Off and
// pushes that row FURTHER off, so only a sweep that clears every row certifies.

export function RoundOffPanel({ branch, period, tier, currentUser, certified = false }) {
  const qc = useQueryClient();
  // '' = "use the branch's own default" — the BE decides it (₹0.50 on the India books,
  // $0.05 on Africa's), so the panel never hardcodes an INR assumption.
  const [maxDiff, setMaxDiff] = useState('');
  const canSettle = isSettlerRole(currentUser?.role) && !certified;

  const { data, isError } = useQuery({
    queryKey: ['tally-tieout', 'roundoff', branch, tier, period, maxDiff],
    queryFn: () => previewRoundOff({ branch, period, tier, maxDiff }),
    // A bad threshold is a 400 the user is actively typing their way out of — don't
    // retry-storm the backend while they type.
    retry: false,
    // The threshold is part of the key, so every keystroke starts a NEW query. Without
    // holding the last result the panel would blink out of existence mid-type (data
    // undefined → the "no residue" self-hide below fires).
    placeholderData: (prev) => prev,
  });

  const invalidate = () => { qc.invalidateQueries({ queryKey: ['tally-tieout'] }); invalidateBooks(qc); };
  const settle = useMutation({ mutationFn: () => settleRoundOff({ branch, period, tier, maxDiff }), onSuccess: invalidate });
  const reverse = useMutation({ mutationFn: () => reverseRoundOff({ branch, period, tier }), onSuccess: invalidate });

  // A settlement is now one voucher PER COST CENTRE (the residue has to carry a real tag
  // or the tie-out can't attribute it to a module), so `existing` is a LIST. Tolerate the
  // old single-object shape so a cached/in-flight response from the previous BE can't
  // blank the panel.
  const existing = data?.existing ? (Array.isArray(data.existing) ? data.existing : [data.existing]) : null;
  const lines = data?.lines || [];
  // The legs, grouped into the vouchers that will post (one per cost centre). Fall back to
  // a single untagged group when the BE sends only the flat `lines` — during a deploy the
  // panel can be served a response from the previous BE, and rendering NOTHING there would
  // be a silent screen hiding what is about to post.
  const groups = data?.groups?.length
    ? data.groups
    : (lines.length ? [{ costCenter: '', lines, plug: data?.plug ?? 0 }] : []);
  // The LEDGERS actually settled. Not `lines`, which counts posting legs — Round Off now
  // carries a balancing leg in every cost-centre group, so legs overstate the ledger count.
  const settles = data?.settles || [];
  const skipped = data?.skipped || [];
  const ccLabel = (cc) => cc || 'no cost centre';
  const after = data?.after || {};
  const before = data?.before || {};
  // Branch currency + cap come from the BE (bookCurrencyOf) — NBO/DAR/FBM keep USD books,
  // so a hardcoded ₹ would have been wrong on half the group. '₹' only until first load.
  const cur = data?.currency || '₹';
  const cap = data?.maxThreshold ?? 10;
  const shownThreshold = Number(maxDiff === '' ? (data?.maxDiff ?? data?.defaultThreshold ?? 0) : maxDiff);

  // Nothing to show when the period has no residue at all and none was ever settled.
  if (!isError && !existing?.length && !lines.length && !(before.off > 0)) return null;

  return (
    <PageSection icon={Scale} title="Rounding settlement"
      subtitle="Posts real, reversible JVs — one per cost centre, so each residue stays attributable to its module — moving ERP onto Tally for sub-rupee rounding residue, so the strict gate is met on merit, not waived."
      actions={existing?.length
        ? <Badge tone="success" size="sm" dot>Settled · {existing.length === 1 ? existing[0].vno : `${existing.length} JVs`}</Badge>
        : <Badge tone={after.tiesAfter ? 'info' : 'warning'} size="sm" dot>{after.tiesAfter ? 'Would tie' : 'Residue open'}</Badge>}>
      <div className="grid gap-3">
        {isError ? (
          <div className="rounded-brand border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-ink">
            Couldn’t work out the rounding position — the threshold may be out of range (it is capped, deliberately: this settles rounding, not real differences).
          </div>
        ) : existing?.length ? (
          <>
            <div className="grid gap-2 rounded-brand border border-success/30 bg-success/5 px-4 py-3 text-sm text-ink">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-success" aria-hidden="true" />
                {existing.length === 1
                  ? <span>Settled by <b>{existing[0].vno}</b> dated {existing[0].date} — the rounding residue is posted to <b>Round Off</b>. Reverse it if you’d rather correct at source.</span>
                  : <span>Settled by <b>{existing.length} JVs</b> dated {existing[0].date} — one per cost centre, so each residue stays attributable to its module. The balancing legs post to <b>Round Off</b>. Reversing removes <b>all {existing.length}</b>.</span>}
              </div>
              {existing.length > 1 && (
                <ul className="grid gap-0.5 pl-6">
                  {existing.map((v) => (
                    <li key={v.vno} className="flex flex-wrap items-baseline gap-x-2 text-xs text-ink-muted">
                      <span className="font-mono tabular-nums text-ink">{v.vno}</span>
                      <span>· {ccLabel(v.costCenter)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canSettle && <Button variant="ghost" icon={RotateCcw} loading={reverse.isPending} onClick={() => reverse.mutate()}>{existing.length === 1 ? 'Reverse settlement' : `Reverse all ${existing.length} JVs`}</Button>}
              {certified && <span className="text-xs text-ink-subtle">This period is certified — re-open the Tally certificate before reversing.</span>}
              {reverse.isError && <span className="text-xs text-danger">{reverse.error?.message}</span>}
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <div className="grid gap-1">
                <label className="text-xs font-semibold text-ink-muted" htmlFor="ro-threshold">Rounding threshold ({cur})</label>
                <input id="ro-threshold" type="number" step="0.01" min="0.01" max={cap} value={maxDiff}
                  placeholder={String(data?.defaultThreshold ?? '')}
                  onChange={(e) => setMaxDiff(e.target.value)}
                  className="w-32 rounded-brand border border-surface-border bg-surface px-2 py-1.5 text-sm tabular-nums text-ink" />
              </div>
              <div className="text-xs text-ink-subtle">
                Only ledgers off by <b>less than this</b> are settled. Capped at {cur}{cap} — anything larger is a real
                difference and must be corrected at source.
              </div>
            </div>

            {/* The consequence, stated plainly — this is the part that isn't obvious. */}
            <div className={`rounded-brand border px-4 py-3 text-sm text-ink ${after.tiesAfter ? 'border-success/30 bg-success/5' : 'border-warning/30 bg-warning/5'}`}>
              {lines.length === 0 ? (
                <>No ledger is within {cur}{shownThreshold.toFixed(2)} of tying — nothing to settle at this threshold.</>
              ) : after.tiesAfter ? (
                <><b className="text-success">This makes every amount tie.</b> {settles.length} ledger{settles.length === 1 ? '' : 's'} settle
                  {data?.plug ? <> (with a {fmt(data.plug, cur)} plug to Round Off)</> : <> — the legs net to nil, so no plug is needed</>}.
                  The period can then be certified, once any name/group fixes owed in Tally are done.</>
              ) : (
                <><b className="text-warning">This will not make the period tie.</b> {settles.length} ledger{settles.length === 1 ? '' : 's'} settle, but{' '}
                  <b>{after.offAfter}</b> would still be off{(after.onlyErpAfter + after.onlyTallyAfter) > 0 && <> and {after.onlyErpAfter + after.onlyTallyAfter} one-sided</>}{' '}
                  ({cur}{Number(after.absDiffAfter || 0).toFixed(2)} remaining) — those are real differences, not rounding.
                  {data?.plug ? <> The {cur}{Math.abs(data.plug).toFixed(2)} remainder is plugged to <b>Round Off</b>, which moves that row further from Tally.</> : null}{' '}
                  Correct them at source, or raise the threshold only if you’ve satisfied yourself they’re immaterial.</>
              )}
            </div>

            {/* Exactly what would post — grouped, because one JV posts PER COST CENTRE so
                each residue stays attributable to its module. Keying by ledger alone would
                also collide here: Round Off carries a balancing leg in every group. */}
            {groups.length > 0 && (
              <div className="grid gap-2">
                <div className="text-xs text-ink-subtle">
                  Posts <b>{groups.length}</b> journal voucher{groups.length === 1 ? '' : 's'} — one per cost centre, so each
                  residue stays attributable to its module instead of falling into Unspecified.
                </div>
                {groups.map((g) => (
                  <div key={g.costCenter || '__untagged'} className="overflow-x-auto rounded-brand border border-surface-border">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-surface-divider bg-surface-muted px-3 py-1.5">
                      <span className="text-xs font-semibold text-ink">{ccLabel(g.costCenter)}</span>
                      <span className="text-xs text-ink-subtle">
                        {g.lines.length} leg{g.lines.length === 1 ? '' : 's'}
                        {g.plug ? <> · {fmt(g.plug, cur)} to Round Off</> : <> · legs net to nil</>}
                      </span>
                    </div>
                    <table className="w-full min-w-[420px] text-sm">
                      <thead>
                        <tr className="border-b border-surface-border text-left text-xs font-semibold uppercase text-ink-muted">
                          <th className="py-1.5 pl-3 pr-3">Ledger</th><th className="py-1.5 pr-3 text-right">Amount</th><th className="py-1.5 pr-3">Dr/Cr</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.lines.map((l) => (
                          <tr key={l.ledger} className="border-b border-surface-divider last:border-0">
                            <td className="py-1.5 pl-3 pr-3">{l.ledger}</td>
                            <td className="py-1.5 pr-3 text-right tabular-nums">{l.amt.toFixed(2)}</td>
                            <td className="py-1.5 pr-3"><Badge tone={l.drCr === 'Dr' ? 'info' : 'navy'} size="sm">{l.drCr}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}

            {skipped.length > 0 && (
              <details className="rounded-brand border border-surface-border bg-surface-muted px-4 py-2">
                <summary className="cursor-pointer text-xs font-semibold text-ink-muted">{skipped.length} ledger{skipped.length === 1 ? '' : 's'} left for correction at source</summary>
                <ul className="mt-2 grid gap-1 text-xs text-ink-subtle">
                  {skipped.map((s) => <li key={s.ledger}><b>{s.ledger}</b> — {s.reason}</li>)}
                </ul>
              </details>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" icon={Scale} loading={settle.isPending} disabled={!canSettle || !lines.length}
                onClick={() => settle.mutate()}>
                Post settlement JV{lines.length ? ` (${lines.length} leg${lines.length === 1 ? '' : 's'})` : ''}
              </Button>
              {/* Say WHY it's disabled — the backend refuses both of these, and a click
                  that only produces a 409/403 is a worse answer than the sentence. */}
              {certified && <span className="text-xs text-ink-subtle">This period is certified — re-open the Tally certificate before settling.</span>}
              {!certified && !canSettle && <span className="text-xs text-ink-subtle">Posting a settlement is FM, Director or Owner only.</span>}
              {settle.isError && <span className="text-xs text-danger">{settle.error?.message}</span>}
            </div>
          </>
        )}
      </div>
    </PageSection>
  );
}
