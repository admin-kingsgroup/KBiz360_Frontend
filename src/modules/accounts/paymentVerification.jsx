/* ════════════════════════════════════════════════════════════════════
   MODULES/PAYMENT-VERIFICATION.JSX

   Finance Payment-Verification inbox — MOVED here from the CRM app.
   Salespeople still record + submit payments inside CRM; once submitted, the
   payment lands in this queue (read from the CRM backend via shared SSO) for
   finance to verify / reject / request clarification. Verifying drives CRM's
   existing logic (tax-invoice auto-generation + workflow advance) untouched.

   UI: shared responsive primitives (PageLayout, Button, Select, Textarea,
   StatusPill, Loading/Error/EmptyState). Business logic / hooks unchanged.
   ════════════════════════════════════════════════════════════════════ */

import React, { useMemo, useState } from 'react';
import { CheckCircle2, XCircle, MessageSquare, FileImage, RefreshCw, Clock, Building2, Calendar } from 'lucide-react';
import { useFinanceQueue, usePaymentActions } from '../../core/usePaymentVerification';
import { PageLayout } from '../../shell/PageLayout';
import { Button, Select, Textarea, StatusPill, LoadingState, ErrorState, EmptyState } from '../../shell/primitives';
import { confirmDialog } from '../../core/ux/confirm';
import { localeOf } from '../../core/format';
import { bc } from '../../core/styleTokens';

// Branch-aware money: ₹ + Indian grouping for the India branches, $ + Western grouping
// for the Africa/VAT branches (NBO/DAR/FBM). `cur` is threaded from the active branch;
// defaults to ₹ so a consolidated / branch-less view is byte-identical to before.
const inr = (n, cur = '₹') => (n != null ? cur + Number(n).toLocaleString(localeOf(cur)) : `${cur}0`);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const fmtTime = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

const METHOD_LABELS = { bank_transfer: 'Bank Transfer', neft: 'NEFT', rtgs: 'RTGS', upi: 'UPI', cheque: 'Cheque', razorpay: 'Razorpay', cash: 'Cash', credit_card: 'Credit Card' };
const REJECTION_REASONS = [
  { value: 'amount_mismatch', label: 'Amount Mismatch' },
  { value: 'fake_screenshot', label: 'Fake / Invalid Screenshot' },
  { value: 'bank_mismatch', label: 'Bank Account Mismatch' },
  { value: 'payment_not_received', label: 'Payment Not Received' },
  { value: 'utr_invalid', label: 'UTR / Reference Invalid' },
  { value: 'other', label: 'Other' },
];

const partyName = (c) => c?.company_name || `${c?.first_name || ''} ${c?.last_name || ''}`.trim() || '—';

function PaymentCard({ p, actions, cur = '₹' }) {
  const [mode, setMode] = useState(null); // 'reject' | 'clarify'
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const busy = actions.verify.isPending || actions.reject.isPending || actions.clarify.isPending;

  const doVerify = async () => {
    // Verifying generates a tax invoice and advances the CRM workflow — it can't be
    // undone from here, so confirm first (Reject/Clarify already require input).
    const { confirmed } = await confirmDialog({
      title: 'Verify this payment?',
      message: `Verifying ${p.payment_number || ''} (${inr(p.amount, cur)}) generates the tax invoice and cannot be undone.`,
      confirmLabel: 'Verify payment',
    });
    if (!confirmed) return;
    setErr(''); actions.verify.mutate(p._id, { onError: (e) => setErr(e.message) });
  };
  const doReject = () => {
    if (!reason) { setErr('Select a rejection reason'); return; }
    setErr(''); actions.reject.mutate({ id: p._id, reason, notes }, { onError: (e) => setErr(e.message) });
  };
  const doClarify = () => {
    if (!note.trim()) { setErr('Enter a clarification note'); return; }
    setErr(''); actions.clarify.mutate({ id: p._id, note }, { onError: (e) => setErr(e.message) });
  };

  return (
    <div className="mb-3 overflow-hidden rounded-brand border border-surface-border bg-surface shadow-card">
      <div className="p-3.5">
        <div className="flex flex-wrap justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-bold text-ink">{p.payment_number || p._id?.slice(-6)}</span>
              <StatusPill tone="warning" icon={Clock}>Pending</StatusPill>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-ink-muted">
              <span className="inline-flex items-center gap-1"><Building2 size={11} /> {partyName(p.customer_id)}</span>
              <span className="inline-flex items-center gap-1"><Calendar size={11} /> {fmtDate(p.payment_date)}</span>
              <span>{METHOD_LABELS[p.payment_method] || p.payment_method}</span>
              {p.utr_number && <span className="font-mono">UTR: {p.utr_number}</span>}
              {p.transaction_id && <span className="font-mono">Ref: {p.transaction_id}</span>}
            </div>
            <div className="mt-1 text-[10.5px] text-ink-subtle">
              Submitted by {p.submitted_by?.first_name || ''} {p.submitted_by?.last_name || ''} · {fmtTime(p.submitted_at)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[20px] font-extrabold tabular-nums text-ink">{inr(p.amount, cur)}</div>
            <div className="text-[11px] capitalize text-ink-muted">{p.payment_type}</div>
          </div>
        </div>

        {p.proof_documents?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {p.proof_documents.map((doc, i) => (
              <a key={i} href={doc.url} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border bg-surface-alt px-2.5 py-1.5 text-[11px] font-medium text-info no-underline transition-colors hover:bg-info-soft">
                <FileImage size={12} /> {doc.filename || `Proof ${i + 1}`}
              </a>
            ))}
          </div>
        )}

        {err && <div className="mt-2.5 text-[11px] font-semibold text-danger">⚠ {err}</div>}

        {/* Action bar */}
        {!mode && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="success" size="sm" icon={CheckCircle2} disabled={busy} onClick={doVerify}>Verify</Button>
            <Button variant="secondary" size="sm" icon={XCircle} disabled={busy}
              className="border-danger/30 text-danger hover:bg-danger-soft hover:text-danger"
              onClick={() => { setMode('reject'); setErr(''); }}>Reject</Button>
            <Button variant="secondary" size="sm" icon={MessageSquare} disabled={busy}
              className="border-info/30 text-info hover:bg-info-soft hover:text-info"
              onClick={() => { setMode('clarify'); setErr(''); }}>Clarify</Button>
          </div>
        )}

        {mode === 'reject' && (
          <div className="mt-3 flex flex-col gap-2">
            <Select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Select rejection reason…</option>
              {REJECTION_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </Select>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} />
            <div className="flex gap-2">
              <Button variant="danger" size="sm" disabled={busy} onClick={doReject}>Confirm Reject</Button>
              <Button variant="secondary" size="sm" onClick={() => setMode(null)}>Cancel</Button>
            </div>
          </div>
        )}

        {mode === 'clarify' && (
          <div className="mt-3 flex flex-col gap-2">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What clarification do you need from the salesperson?" rows={2} />
            <div className="flex gap-2">
              <Button variant="primary" size="sm" disabled={busy} onClick={doClarify}>Send Request</Button>
              <Button variant="secondary" size="sm" onClick={() => setMode(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function PaymentVerificationLive({ branch } = {}) {
  const q = useFinanceQueue();
  const actions = usePaymentActions();
  const data = q.data || {};
  const payments = useMemo(() => data.payments || (Array.isArray(data) ? data : []) || [], [data]);
  const total = data.summary?.total_amount ?? payments.reduce((s, p) => s + (p.amount || 0), 0);
  // Active branch currency — ₹ for India, $ for the Africa/VAT branches.
  const cur = (bc(branch) || {}).cur || '₹';

  return (
    <PageLayout
      maxWidth="max-w-4xl mx-auto"
      title="Payment Verification"
      subtitle={`${payments.length} payment${payments.length === 1 ? '' : 's'} pending · ${inr(total, cur)} · submitted from CRM by sales`}
      actions={<Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => q.refetch()}>Refresh</Button>}
    >
      {q.isLoading && <LoadingState label="Loading queue…" />}
      {q.isError && (
        <ErrorState
          title="Couldn’t reach CRM backend"
          message={`${q.error?.message || 'Failed to reach CRM backend'} — check VITE_CRM_API_BASE and that you are logged in with finance permissions.`}
          onRetry={q.refetch}
        />
      )}
      {!q.isLoading && !q.isError && payments.length === 0 && (
        <EmptyState icon={CheckCircle2} title="All payments verified" hint="New submissions from CRM sales will appear here." />
      )}
      {payments.map((p) => <PaymentCard key={p._id} p={p} actions={actions} cur={cur} />)}
    </PageLayout>
  );
}
