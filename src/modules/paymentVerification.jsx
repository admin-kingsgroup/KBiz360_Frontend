/* ════════════════════════════════════════════════════════════════════
   MODULES/PAYMENT-VERIFICATION.JSX

   Finance Payment-Verification inbox — MOVED here from the CRM app.
   Salespeople still record + submit payments inside CRM; once submitted, the
   payment lands in this queue (read from the CRM backend via shared SSO) for
   finance to verify / reject / request clarification. Verifying drives CRM's
   existing logic (tax-invoice auto-generation + workflow advance) untouched.
   ════════════════════════════════════════════════════════════════════ */

import React, { useMemo, useState } from 'react';
import { CheckCircle2, XCircle, MessageSquare, FileImage, RefreshCw, Clock, Building2, Calendar } from 'lucide-react';
import { card, inp } from '../core/styles';
import { useFinanceQueue, usePaymentActions } from '../core/usePaymentVerification';
import { confirmDialog } from '../core/ux/confirm';

const DARK = '#0d1326', GOLD = '#d4a437', DIM = '#5a6691', BLUE = '#185FA5', RED = '#A32D2D', GREEN = '#27500A';
const inr = (n) => (n != null ? '₹' + Number(n).toLocaleString('en-IN') : '₹0');
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
const btn = (bg, fg) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, background: bg, color: fg });

function PaymentCard({ p, actions }) {
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
      message: `Verifying ${p.payment_number || ''} (${inr(p.amount)}) generates the tax invoice and cannot be undone.`,
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
    <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 12 }}>
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: DARK, fontFamily: 'monospace' }}>{p.payment_number || p._id?.slice(-6)}</span>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, fontWeight: 700, background: '#FAEEDA', color: '#854F0B', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={9} /> Pending</span>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11, color: DIM, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Building2 size={11} /> {partyName(p.customer_id)}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Calendar size={11} /> {fmtDate(p.payment_date)}</span>
              <span>{METHOD_LABELS[p.payment_method] || p.payment_method}</span>
              {p.utr_number && <span style={{ fontFamily: 'monospace' }}>UTR: {p.utr_number}</span>}
              {p.transaction_id && <span style={{ fontFamily: 'monospace' }}>Ref: {p.transaction_id}</span>}
            </div>
            <div style={{ fontSize: 10.5, color: '#8a93b2', marginTop: 4 }}>
              Submitted by {p.submitted_by?.first_name || ''} {p.submitted_by?.last_name || ''} · {fmtTime(p.submitted_at)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: DARK }}>{inr(p.amount)}</div>
            <div style={{ fontSize: 11, color: DIM, textTransform: 'capitalize' }}>{p.payment_type}</div>
          </div>
        </div>

        {p.proof_documents?.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {p.proof_documents.map((doc, i) => (
              <a key={i} href={doc.url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, background: '#f3f4f8', border: '1px solid #e1e3ec', borderRadius: 8, padding: '6px 10px', color: BLUE, textDecoration: 'none' }}>
                <FileImage size={12} /> {doc.filename || `Proof ${i + 1}`}
              </a>
            ))}
          </div>
        )}

        {err && <div style={{ marginTop: 10, fontSize: 11, color: RED, fontWeight: 600 }}>⚠ {err}</div>}

        {/* Action bar */}
        {!mode && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button disabled={busy} onClick={doVerify} style={btn(GREEN, '#fff')}><CheckCircle2 size={13} /> Verify</button>
            <button disabled={busy} onClick={() => { setMode('reject'); setErr(''); }} style={btn('#FCEBEB', RED)}><XCircle size={13} /> Reject</button>
            <button disabled={busy} onClick={() => { setMode('clarify'); setErr(''); }} style={btn('#E6F1FB', BLUE)}><MessageSquare size={13} /> Clarify</button>
          </div>
        )}

        {mode === 'reject' && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <select value={reason} onChange={(e) => setReason(e.target.value)} style={{ ...inp, minHeight: 34, fontSize: 12 }}>
              <option value="">Select rejection reason…</option>
              {REJECTION_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} style={{ ...inp, fontSize: 12, resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={busy} onClick={doReject} style={btn(RED, '#fff')}>Confirm Reject</button>
              <button onClick={() => setMode(null)} style={btn('#f3f4f8', DIM)}>Cancel</button>
            </div>
          </div>
        )}

        {mode === 'clarify' && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What clarification do you need from the salesperson?" rows={2} style={{ ...inp, fontSize: 12, resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={busy} onClick={doClarify} style={btn(BLUE, '#fff')}>Send Request</button>
              <button onClick={() => setMode(null)} style={btn('#f3f4f8', DIM)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function PaymentVerificationLive() {
  const q = useFinanceQueue();
  const actions = usePaymentActions();
  const data = q.data || {};
  const payments = useMemo(() => data.payments || (Array.isArray(data) ? data : []) || [], [data]);
  const total = data.summary?.total_amount ?? payments.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div style={{ padding: '12px 10px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: DARK }}>Payment Verification</h2>
          <p style={{ margin: '2px 0 0', fontSize: 10.5, color: DIM }}>
            {payments.length} payment{payments.length === 1 ? '' : 's'} pending · {inr(total)} · submitted from CRM by sales
          </p>
        </div>
        <button onClick={() => q.refetch()} style={{ ...inp, width: 'auto', minHeight: 32, fontSize: 11, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {q.isLoading && <div style={{ ...card, padding: 28, textAlign: 'center', color: DIM, fontSize: 12 }}>Loading queue…</div>}
      {q.isError && <div style={{ ...card, padding: 16, color: RED, fontSize: 12, fontWeight: 600 }}>⚠ {q.error?.message || 'Failed to reach CRM backend'} — check VITE_CRM_API_BASE and that you are logged in with finance permissions.</div>}
      {!q.isLoading && !q.isError && payments.length === 0 && (
        <div style={{ ...card, padding: 36, textAlign: 'center', color: DIM }}>
          <CheckCircle2 size={26} style={{ color: GREEN, marginBottom: 8 }} /><div style={{ fontSize: 13, fontWeight: 600, color: DARK }}>All payments verified</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>New submissions from CRM sales will appear here.</div>
        </div>
      )}
      {payments.map((p) => <PaymentCard key={p._id} p={p} actions={actions} />)}
    </div>
  );
}
