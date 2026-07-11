import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Lock, Snowflake, PenLine, RotateCcw, AlertTriangle } from 'lucide-react';
import { getTallyCert, freezeTallyCert, signTallyCert, reopenTallyCert } from './api';
import { PageSection, Badge, Button, ErrorState } from '../../shell/primitives';

// Re-opening a certified period reverses sign-offs — approver-only (Director/Owner);
// the backend enforces it too, this just hides the control from non-approvers.
const canReopenRole = (role) => /owner|director|super.?admin/i.test(String(role || ''));

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

export function CertifyPanel({ branch, period, tier, offTotal, staleAccepted = 0, currentUser }) {
  const qc = useQueryClient();
  const tied = (offTotal || 0) === 0;
  const { data, isError, refetch } = useQuery({
    queryKey: ['tally-tieout', 'cert', branch, tier, period],
    queryFn: () => getTallyCert({ branch, period, tier }),
  });
  const cert = data?.certificate || null;
  const progress = data?.progress || { done: 0, total: 4, next: null };
  const gate = data?.canSign || { ok: false, reason: '' };
  const status = cert?.status || (tied ? 'reconciled' : 'open');
  const meta = STATUS[status] || STATUS.open;
  const frozen = !!cert?.snapshot?.frozenAt;
  const certified = status === 'signed' || status === 'locked';
  const canReopen = certified && canReopenRole(currentUser?.role);

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
        {/* Stale accepted variances — an acceptance whose difference has since moved
            (a corrective re-upload). Non-silent so a reviewer re-checks before signing. */}
        {staleAccepted > 0 && (
          <div className="flex items-start gap-2 rounded-brand border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-ink">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
            <span><b>{staleAccepted} accepted variance{staleAccepted === 1 ? '' : 's'} changed</b> since being accepted — the recorded amount no longer matches the live difference. Re-review (re-accept or clear) in the <b>Defects</b> tab before signing.</span>
          </div>
        )}
        {/* gate state */}
        {status === 'locked' ? (
          <div className="flex items-center gap-2 rounded-brand border border-navy/30 bg-navy/5 px-4 py-3 text-sm text-ink">
            <Lock size={16} className="text-navy" aria-hidden="true" />
            Certified — the {tier === 'year' ? 'year-end' : 'month-end'} close gate is satisfied. Signed by {cert.signatures.map((s) => s.role).join(' → ')}. Re-uploading a corrected TB / Day Book is blocked until re-opened.
          </div>
        ) : !tied && !frozen ? (
          <div className="rounded-brand border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-ink">
            <b className="text-danger">Not certifiable yet.</b> The ERP doesn't tie to Tally — {offTotal} ledger{offTotal === 1 ? '' : 's'} still off. Clear them in the <b>Defects</b> tab, then freeze &amp; certify.
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

            {/* actions */}
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" icon={Snowflake} loading={freeze.isPending} disabled={!tied}
                onClick={() => freeze.mutate()}>
                {frozen ? 'Re-freeze snapshot' : 'Freeze tie-out'}
              </Button>
              {/* Sign requires the BE gate (frozen snapshot clean) AND the LIVE
                  tie-out still clean — otherwise a voucher posted after a clean
                  freeze could be signed/locked on a stale-clean snapshot. */}
              <Button variant="primary" icon={PenLine} loading={sign.isPending} disabled={!gate.ok || !tied}
                onClick={() => sign.mutate()}>
                {progress.next ? `Sign as ${progress.next.role}` : 'Sign'}
              </Button>
              {frozen && !tied && <span className="text-xs font-semibold text-danger">Tie-out changed since freezing — {offTotal} now off. Clear/accept them, then re-freeze.</span>}
              {!tied && !frozen && <span className="text-xs font-semibold text-danger">{offTotal} off — clear before signing</span>}
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
                  <span className="text-xs text-ink-subtle">This re-opens the Tally attestation only — it does not unlock the ERP accounting period.</span>
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
