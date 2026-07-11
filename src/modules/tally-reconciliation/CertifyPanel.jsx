import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Lock, Snowflake, PenLine } from 'lucide-react';
import { getTallyCert, freezeTallyCert, signTallyCert } from './api';
import { PageSection, Badge, Button, ErrorState } from '../../shell/primitives';

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

export function CertifyPanel({ branch, period, tier, offTotal }) {
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

  const invalidate = () => qc.invalidateQueries({ queryKey: ['tally-tieout'] });
  const freeze = useMutation({ mutationFn: () => freezeTallyCert({ branch, period, tier }), onSuccess: invalidate });
  const sign = useMutation({ mutationFn: () => signTallyCert({ branch, period, tier }), onSuccess: invalidate });

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
            Certified — the {tier === 'year' ? 'year-end' : 'month-end'} close gate is satisfied. Signed by {cert.signatures.map((s) => s.role).join(' → ')}.
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
      </div>
      )}
    </PageSection>
  );
}
