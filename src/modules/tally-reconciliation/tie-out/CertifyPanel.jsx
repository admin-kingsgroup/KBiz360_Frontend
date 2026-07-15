import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Lock, Snowflake, PenLine, RotateCcw } from 'lucide-react';
import { getTallyCert, freezeTallyCert, signTallyCert, reopenTallyCert } from '../api';
import { isApproverRole } from '../format';
import { PageSection, Badge, Button, ErrorState } from '../../../shell/primitives';

// ─── Tally certificate — the sign-off that gates the month close (Phase 3) ────
// A month can't hard-lock until this is signed: it certifies "ERP ties to Tally,
// difference = 0". Freeze snapshots the tie-out (only when tied); then the chain
// AE → FM → Director → Owner signs it. `offTotal` from the board tells us whether
// the current tie is clean — you can't certify a month that doesn't tie.

const STATUS = {
  locked: { tone: 'navy', label: 'Certified · locked' },
  signed: { tone: 'success', label: 'Signing…' },
  reconciled: { tone: 'info', label: 'Ready to certify' },
  open: { tone: 'warning', label: 'Not tied' },
};

export function CertifyPanel({ branch, period, tier, offTotal, fixTotal = 0, currentUser }) {
  const qc = useQueryClient();
  // "Tied" for the close gate now also requires every Tally ledger name/group to match
  // ERP (policy: correct Tally before sign-off) — mirrors the backend fixTotal gate.
  const tied = (offTotal || 0) === 0 && (fixTotal || 0) === 0;
  // What still blocks the close, in words (amount gaps and/or name-group fixes).
  const blockParts = [];
  if ((offTotal || 0) > 0) blockParts.push(`${offTotal} ledger${offTotal === 1 ? '' : 's'} off`);
  if ((fixTotal || 0) > 0) blockParts.push(`${fixTotal} name/group fix${fixTotal === 1 ? '' : 'es'} owed in Tally`);
  const blockLabel = blockParts.join(' · ');
  const { data, isError, refetch } = useQuery({
    queryKey: ['tally-tieout', 'cert', branch, tier, period],
    queryFn: () => getTallyCert({ branch, period, tier }),
  });
  const cert = data?.certificate || null;
  const progress = data?.progress || { done: 0, total: 4, next: null };
  const gate = data?.canSign || { ok: false, reason: '' };
  const status = cert?.status || (tied ? 'reconciled' : 'open');
  const frozen = !!cert?.snapshot?.frozenAt;
  const certified = status === 'signed' || status === 'locked';
  const canReopen = certified && isApproverRole(currentUser?.role);
  // A re-opened cert persists status 'open' with a cleared snapshot; show the live
  // tie state in the badge rather than a stale "Not tied" when the ERP actually ties.
  const displayStatus = (status === 'open' && !frozen && tied) ? 'reconciled' : status;
  const meta = STATUS[displayStatus] || STATUS.open;

  const [reopening, setReopening] = useState(false);
  const [reason, setReason] = useState('');
  const invalidate = () => qc.invalidateQueries({ queryKey: ['tally-tieout'] });
  const freeze = useMutation({ mutationFn: () => freezeTallyCert({ branch, period, tier }), onSuccess: invalidate });
  const sign = useMutation({ mutationFn: () => signTallyCert({ branch, period, tier }), onSuccess: invalidate });
  const reopen = useMutation({
    mutationFn: () => reopenTallyCert({ branch, period, tier, reason: reason.trim() }),
    onSuccess: () => { setReopening(false); setReason(''); invalidate(); },
  });

  return (
    <PageSection icon={ShieldCheck}
      title={`${tier === 'year' ? 'Year-End' : 'Month-End'} Tally Certificate`}
      subtitle="A month can't hard-lock until ERP ties to Tally and this is signed — the close gate."
      actions={<Badge tone={meta.tone} size="sm" dot>{meta.label}</Badge>}>
      {isError ? (
        <ErrorState title="Couldn’t load the certificate" message="The reconciliation service didn’t respond." onRetry={() => refetch()} />
      ) : (
      <div className="grid gap-3">
        {/* gate state */}
        {status === 'locked' ? (
          <div className="flex items-center gap-2 rounded-brand border border-navy/30 bg-navy/5 px-4 py-3 text-sm text-ink">
            <Lock size={16} className="text-navy" aria-hidden="true" />
            Certified — the {tier === 'year' ? 'year-end' : 'month-end'} close gate is satisfied. Signed by {cert.signatures.map((s) => s.role).join(' → ')}. Re-uploading a corrected TB / Day Book is blocked until re-opened.
          </div>
        ) : !tied && !frozen ? (
          <div className="rounded-brand border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-ink">
            <b className="text-danger">Not certifiable yet.</b>{' '}
            {(offTotal || 0) > 0 && <>The ERP doesn't tie to Tally — {offTotal} ledger{offTotal === 1 ? '' : 's'} still off. Clear them in the <b>Unmatched Entries</b> and <b>Ledger Matcher</b> tabs. </>}
            {(fixTotal || 0) > 0 && <>{fixTotal} Tally ledger name/group{fixTotal === 1 ? '' : 's'} still differ{fixTotal === 1 ? 's' : ''} from ERP — rename/regroup in Tally (see <b>Ledger Matcher</b>) and re-upload. </>}
            Then freeze &amp; certify.
          </div>
        ) : (
          <>
            {/* chain progress */}
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-ink-muted">
                <span>Sign chain{progress.next ? ` · next: ${progress.next.role}` : ' · complete'}</span>
                <span className="tabular-nums">{progress.done} / {progress.total} signed</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-alt">
                <div className="h-full rounded-full bg-success transition-all" style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
              </div>
              {cert?.signatures?.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {cert.signatures.map((s, i) => (
                    <span key={i} className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">{s.role} · {s.action}{s.by ? ` · ${s.by}` : ''}</span>
                  ))}
                </div>
              ) : null}
            </div>

            {/* actions. Freeze is blocked once signing has started (the snapshot is
                frozen — re-open to change). */}
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" icon={Snowflake} loading={freeze.isPending} disabled={!tied || (cert?.signatures?.length > 0)}
                onClick={() => freeze.mutate()}>
                {frozen ? 'Re-freeze snapshot' : 'Freeze tie-out'}
              </Button>
              {/* Sign requires the BE gate (frozen snapshot clean) AND the LIVE tie
                  still clean — otherwise a voucher/re-upload after a clean freeze
                  could be signed on a stale-clean snapshot. */}
              <Button variant="primary" icon={PenLine} loading={sign.isPending} disabled={!gate.ok || !tied}
                onClick={() => sign.mutate()}>
                {progress.next ? `Sign as ${progress.next.role}` : 'Sign'}
              </Button>
              {frozen && !tied && <span className="text-xs font-semibold text-danger">Tie-out changed since freezing — {blockLabel}. Fix, then re-freeze.</span>}
              {!tied && !frozen && <span className="text-xs font-semibold text-danger">{blockLabel} — fix before signing</span>}
              {tied && !frozen && <span className="text-xs text-ink-subtle">Freeze the snapshot, then the chain can sign.</span>}
              {tied && frozen && !gate.ok && gate.reason && <span className="text-xs text-ink-subtle">{gate.reason}</span>}
              {freeze.isError && <span className="text-xs text-danger">{freeze.error?.message}</span>}
              {sign.isError && <span className="text-xs text-danger">{sign.error?.message}</span>}
            </div>
          </>
        )}

        {/* Re-open — reverses the sign-offs so a certified period can be corrected and
            re-signed. Approver-only (Director/Owner); a reason is required and logged. */}
        {canReopen && (
          <div className="rounded-brand border border-surface-border bg-surface-muted px-4 py-3">
            {!reopening ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" icon={RotateCcw} onClick={() => setReopening(true)}>Re-open to correct</Button>
                <span className="text-xs text-ink-subtle">Found an error in Tally after certifying? Re-open to re-upload corrected data, then re-sign.</span>
              </div>
            ) : (
              <div className="grid gap-2">
                <label className="text-xs font-semibold text-ink-muted" htmlFor="reopen-reason">Reason for re-opening (logged)</label>
                <textarea id="reopen-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
                  placeholder="e.g. BSP ledger had a wrong closing in Tally — corrected + re-exporting"
                  className="w-full rounded-brand border border-surface-border bg-surface p-2 text-sm text-ink" />
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="danger" icon={RotateCcw} loading={reopen.isPending} disabled={!reason.trim()} onClick={() => reopen.mutate()}>
                    Confirm re-open ({cert?.signatures?.length || 0} signature{(cert?.signatures?.length || 0) === 1 ? '' : 's'} cleared)
                  </Button>
                  <Button variant="ghost" onClick={() => { setReopening(false); setReason(''); }}>Cancel</Button>
                  {reopen.isError && <span className="text-xs text-danger">{reopen.error?.message}</span>}
                  <span className="text-xs text-ink-subtle">Withdraws the Tally sign-offs so the period can be corrected and re-signed. It does not unlock the ERP accounting period — an ERP-side correction to a locked month needs the separate period-unlock control.</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      )}
    </PageSection>
  );
}
