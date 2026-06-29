import React, { useState } from 'react';
import { useVoucherPreview, useCreateVoucher, useUpdateVoucher } from '../useAccounting';
import { openPrintPreview } from '../PrintPreview';
import { B, bc, VWrap, VHead, FL, inp, card, btnG, btnGh } from '../styles';
import { VOUCHER_REGISTRY } from './registry';
import { DARK, DIM, BLUE, RED, GREEN, money, brCodeOf, escHtml } from './ui';
import { JvBlock } from './JvBlock';
import { useFormKeys } from '../ux/forms';
import { toast } from '../ux/toast';
import { Kbd } from '../ux/widgets.jsx';
import { isViewOnly } from '../api';
import { triggerSaveRefresh } from '../hooks';
import { useVNo } from '../useNextNo';

/**
 * Unified voucher form (Option C).
 *
 * One engine renders any category present in VOUCHER_REGISTRY, in either mode:
 *   - mode="create": blank state, posts via useCreateVoucher, page chrome (VWrap)
 *   - mode="edit":   seeded from `voucher`, saves via useUpdateVoucher, embedded
 *
 * It owns everything category-agnostic — the live backend journal preview,
 * balance/validation, and the save → print/close flow — while the category's
 * registry entry supplies the fields and the state↔payload transforms.
 */
export function VoucherShell({ category, mode = 'create', branch, voucher, voucherId, cur: curProp, onBack, onClose }) {
  // A partial refund is stored as category 'refund' (+ partialAmount) so it reuses the
  // refund plumbing; render it with the dedicated 'refund-partial' form when editing.
  const regKey = (category === 'refund' && +(voucher?.partialAmount) > 0) ? 'refund-partial' : category;
  const desc = VOUCHER_REGISTRY[regKey];
  const isEdit = mode === 'edit';

  const branchCode = isEdit ? (voucher?.branch || null) : brCodeOf(branch);
  const cur = curProp || bc(branch)?.cur || '₹';
  const editId = isEdit ? (voucherId || voucher?.id || voucher?._id) : undefined;
  const ctx = { branch: isEdit ? (voucher?.branch || branch) : branch, branchCode, cur, editId };
  // Live "next number" preview shown in place of the old static "Auto" (create mode).
  // Advisory — the server assigns the guaranteed-unique number atomically at save.
  const vNo = useVNo(branchCode, desc?.type);

  const [state, setState] = useState(() => {
    const s = isEdit && voucher ? desc.fromVoucher(voucher, ctx) : desc.initial(ctx);
    // Free-text Tally Ref (original Tally voucher no) — shared across every voucher type.
    return { ...s, sourceRef: s.sourceRef != null ? s.sourceRef : ((isEdit && voucher && voucher.sourceRef) || '') };
  });
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const createMut = useCreateVoucher();
  const updateMut = useUpdateVoucher();
  const saving = createMut.isPending || updateMut.isPending;

  // Live, backend-computed journal — identical engine for create and edit.
  const previewBody = { ...desc.toBody(state, ctx), sourceRef: state.sourceRef || '' };
  const pv = useVoucherPreview(previewBody).data || {};

  const val = desc.validate(state);
  // View-only accounts can open and review vouchers but never post them; the
  // backend also rejects the write, so this just pre-disables the button.
  const viewOnly = isViewOnly();
  const canSave = val.ok && !!branchCode && !saving && !viewOnly;

  const dismiss = () => (onClose || onBack || (() => {}))();
  const reset = () => { setState(desc.initial(ctx)); setDone(false); setErr(''); };

  const save = () => {
    if (!canSave) return;
    setErr('');
    const base = { ...desc.toBody(state, ctx), sourceRef: state.sourceRef || '' };
    const ok = (vno) => {
      toast(`${desc.label} saved${vno ? ` — ${vno}` : ''}`);
      triggerSaveRefresh(); // advance the "next number" preview to the following one
      // Rapid-entry vouchers (e.g. Debit Note) close the saved-confirmation panel and
      // drop straight back to a fresh blank voucher for the next entry (Tally-style);
      // every other type still shows the Print / ＋ New Voucher panel.
      if (!isEdit && desc.closeOnSave) reset();
      else setDone(true);
    };
    const fail = (e) => { setErr(e.message); toast(`Could not save — ${e.message}`, 'error'); };
    if (isEdit) {
      const body = { ...voucher, ...base, status: voucher.status || 'saved' };
      delete body.id; delete body._id; delete body.createdAt; delete body.updatedAt;
      const id = voucherId || voucher.id || voucher._id;
      updateMut.mutate({ id, body }, { onSuccess: () => ok(voucher.vno), onError: fail });
    } else {
      createMut.mutate(base, { onSuccess: (r) => ok(r && (r.vno || r.voucherNo)), onError: fail });
    }
  };

  // Tally-style form keys: Enter advances fields, Ctrl/Cmd+Enter saves, Esc backs
  // out (edit mode). Datalist/ledger autocompletes keep native Enter (see useFormKeys).
  const formKeys = useFormKeys({ onSubmit: save, onCancel: isEdit ? dismiss : undefined });
  const errRef = React.useRef(null);

  // Move focus to the first field when the form opens — keyboard entry without a
  // mouse click first. (Runs once; the post-save panel doesn't re-trigger it.)
  React.useEffect(() => {
    const el = formKeys.ref.current;
    if (!el) return undefined;
    const first = el.querySelector('input,select,textarea');
    if (!first) return undefined;
    const id = setTimeout(() => { try { first.focus(); } catch { /* ignore */ } }, 50);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A save error can render below the fold on long forms — bring it into view so
  // a failed save is never silent.
  React.useEffect(() => {
    if (err && errRef.current) { try { errRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch { /* ignore */ } }
  }, [err]);

  const printEntry = () => {
    const fmt = (n) => { const x = Math.round(Number(n) || 0); return x ? money(cur, x) : ''; };
    const rows = (pv.postings || []).map((p) => `<tr><td>${escHtml(p.ledger)}</td><td>${escHtml(p.group || '')}</td><td class="r">${fmt(p.debit)}</td><td class="r">${fmt(p.credit)}</td></tr>`).join('');
    const html = `<style>
      .ve{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#141414}
      .ve h1{font-size:16px;margin:0 0 2px}
      .ve .meta{font-size:10.5px;color:#5a6691;margin:0 0 4px}
      .ve table{width:100%;border-collapse:collapse;font-size:10.5px;margin-top:8px}
      .ve th{background:#141414;color:#A07828;text-align:left;padding:6px 8px;font-size:9.5px}
      .ve th.r,.ve td.r{text-align:right}
      .ve td{padding:5px 8px;border-bottom:1px solid #dfe2e7}
      .ve tfoot td{background:#FBF3DE;font-weight:800;border-top:2px solid #A07828}
    </style>
    <div class="ve">
      <h1>${escHtml(desc.label)} — ${escHtml(isEdit ? (voucher.vno || '') : 'New')}</h1>
      <p class="meta">${escHtml(category)} · ${escHtml(state.date || '')} · ${escHtml(branchCode || '')}</p>
      ${state.remarks ? `<p class="meta">${escHtml(state.remarks)}</p>` : ''}
      <table>
        <thead><tr><th>Ledger</th><th>Group</th><th class="r">Debit</th><th class="r">Credit</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="2">Total</td><td class="r">${fmt(pv.totalDebit)}</td><td class="r">${fmt(pv.totalCredit)}</td></tr></tfoot>
      </table>
    </div>`;
    openPrintPreview({ title: `${desc.label} — ${isEdit ? (voucher.vno || '') : 'New'}`, recommend: 'portrait', html });
  };

  // ── shared live journal table ──────────────────────────────────────
  const journalTable = (
    <div style={{ ...card, padding: 10, marginTop: 12, boxShadow: 'none', border: '1px solid #E8D9A8', background: '#FFFDF7' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontWeight: 700, color: '#6B4E0F', fontSize: 12 }}>Accounting Effect — Full Journal (where this hits the books)</div>
        <span style={{ fontSize: 11, fontWeight: 800, color: pv.balanced ? GREEN : RED }}>{pv.error ? '⚠ ' + pv.error : pv.balanced ? '✓ Balanced' : `✗ Out by ${money(cur, pv.diff)}`}</span>
      </div>
      {pv.missing?.length > 0 && (
        <div style={{ margin: '0 0 8px', padding: '6px 9px', borderRadius: 6, background: '#fbe9e9', border: '1px solid #f3c9c9', color: '#d97706', fontSize: 11, fontWeight: 600 }}>
          ⚠ Ledger not in Chart of Accounts: <b>{pv.missing.join(', ')}</b>. Create it in Masters first.
        </div>
      )}
      <JvBlock postings={pv.postings} />
    </div>
  );

  // ── edit-mode chrome ───────────────────────────────────────────────
  // Editing opens the SAME voucher window as create: the dark/gold themed
  // header (icon · label · branch/tax badge) + gold left border. One frame,
  // reused by both the editable form and the post-save panel, so every place
  // that opens an edit (ledger/day-book/cash-book drills, P&L, approvals)
  // shows an identical-looking window to the create screen.
  const editFrame = (children) => {
    const cfg = (B && B[branchCode]) || {};
    const taxBadge = cfg.taxType === 'GST' ? 'GST' : ('VAT ' + (cfg.vatRate || 0) + '%');
    return (
      <div style={{ background: '#fff', overflow: 'hidden', borderLeft: '4px solid #A07828', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", color: '#1F2328', WebkitFontSmoothing: 'antialiased' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px', background: '#141414', borderBottom: '3px solid #A07828', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(160,120,40,0.18)', color: '#A07828', border: '1px solid rgba(160,120,40,0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{desc.icon}</div>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, letterSpacing: '0.3px', color: '#fff' }}>{desc.label}</p>
              <p style={{ margin: 0, fontSize: 10.5, color: '#8A8A84', letterSpacing: '0.3px' }}>{(voucher?.vno || '') + ' · ' + (branchCode || '') + ' · ' + (voucher?.type || '') + ' - ' + (voucher?.category || category)}</p>
            </div>
          </div>
          <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 999, background: '#FBF3DE', color: '#6B4E0F', fontWeight: 800, border: '1px solid #E8D9A8', letterSpacing: '0.04em' }}>{(cfg.curCode || cur) + ' · ' + taxBadge}</span>
        </div>
        {children}
      </div>
    );
  };

  // ── post-save preview (Print / Close|New) ──────────────────────────
  if (done) {
    const doneInner = (
      <div style={{ padding: isEdit ? 14 : '4px 2px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontWeight: 800, color: GREEN, fontSize: 14 }}>✓ Saved{isEdit && voucher.vno ? ` — ${voucher.vno}` : ''}</div>
          {isEdit && <button onClick={dismiss} title="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: DIM, fontSize: 18 }}>✕</button>}
        </div>
        {journalTable}
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button onClick={printEntry} className="max-tablet:min-h-[44px]" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, background: BLUE, color: '#fff' }}>🖨 Print</button>
          {isEdit
            ? <button onClick={dismiss} className="max-tablet:min-h-[44px]" style={{ padding: '10px 18px', borderRadius: 7, border: '1px solid #cdd1d8', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, background: '#fff', color: DARK }}>Close</button>
            : <button onClick={reset} className="max-tablet:min-h-[44px]" style={{ ...btnG }}>＋ New Voucher</button>}
        </div>
      </div>
    );
    if (isEdit) return editFrame(doneInner);
    return <VWrap title={desc.label} icon={desc.icon} vNo={vNo} branch={branch}>{doneInner}</VWrap>;
  }

  // ── the editable form ──────────────────────────────────────────────
  const formInner = (
    <>
      {desc.fields({ state, setState, ctx })}
      <div style={{ marginTop: 12 }}><FL label="Tally Ref"><input value={state.sourceRef || ''} onChange={(e) => setState((s) => ({ ...s, sourceRef: e.target.value }))} style={{ ...inp, maxWidth: 200 }} placeholder="original Tally voucher no (optional)" /></FL></div>
      {!desc.hideShellJournal && journalTable}
      {!branchCode && !isEdit && <div style={{ padding: '8px 12px', borderRadius: 8, background: '#FAEEDA', fontSize: 10.5, color: '#854F0B', fontWeight: 600, textAlign: 'center', margin: '10px 0' }}>Select a specific branch (not “All”) to post this voucher.</div>}
      {err && <div ref={errRef} role="alert" style={{ padding: '8px 12px', borderRadius: 8, background: '#FCEBEB', fontSize: 11, color: RED, fontWeight: 600, margin: '10px 0' }}>! {err}</div>}
      {viewOnly && <div style={{ padding: '8px 12px', borderRadius: 8, background: '#FAEEDA', fontSize: 10.5, color: '#854F0B', fontWeight: 600, textAlign: 'center', margin: '10px 0' }}>View only — this account can review vouchers but cannot post them.</div>}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
        {!isEdit && <button onClick={reset} className="max-tablet:min-h-[44px]" style={btnGh}>Reset</button>}
        {isEdit && <button onClick={dismiss} className="max-tablet:min-h-[44px]" style={btnGh}>Back</button>}
        <button onClick={save} disabled={!canSave} title={viewOnly ? 'View only — changes are not allowed' : 'Save (Ctrl/Cmd+Enter)'} className="max-tablet:min-h-[44px]" style={{ ...btnG, background: canSave ? '#A07828' : '#cbd0db', opacity: canSave ? 1 : 0.6, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          {desc.icon} Save Voucher {saving ? '…' : val.hint} {!saving && <Kbd>⌃↵</Kbd>}
        </button>
      </div>
    </>
  );

  // Approved / posted vouchers are READ-ONLY. Editing one would silently re-post the
  // journal outside the approval workflow, so the drill-downs that reuse this shell
  // (Day Book, ledgers, Cash Book, P&L / Balance Sheet, registers) open it for viewing
  // only. To change it, Revoke it back to Pending in Voucher Approvals — the number is
  // kept (a booking-driven Sales/Purchase leg is edited on its SO/PO/GP booking).
  if (isEdit && (voucher?.status === 'approved' || voucher?.status === 'posted')) {
    const byBooking = voucher?.locked && voucher?.source === 'booking';
    return editFrame(
      <div style={{ padding: 14 }}>
        <div style={{ padding: '10px 12px', borderRadius: 7, background: '#FBF3DE', border: '1px solid #E8D9A8', color: '#6B4E0F', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
          🔒 Approved &amp; posted — read-only. {byBooking ? <>Edit it on its SO / PO / GP booking <b>{voucher.bookingId}</b>.</> : <>To edit, <b>Revoke</b> it back to Pending in <b>Voucher Approvals</b> — the number is kept.</>}
        </div>
        {journalTable}
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button onClick={printEntry} className="max-tablet:min-h-[44px]" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, background: BLUE, color: '#fff' }}>🖨 Print</button>
          <button onClick={dismiss} className="max-tablet:min-h-[44px]" style={{ padding: '10px 18px', borderRadius: 7, border: '1px solid #cdd1d8', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, background: '#fff', color: DARK }}>Close</button>
        </div>
      </div>
    );
  }

  if (isEdit) {
    return editFrame(
      <div style={{ padding: '14px 16px' }} ref={formKeys.ref} onKeyDown={formKeys.onKeyDown}>{formInner}</div>
    );
  }
  return (
    <VWrap title={desc.label} icon={desc.icon} vNo={vNo} branch={branch}>
      <VHead vNo={vNo} />
      <div style={{ padding: '14px 16px' }}>
        {desc.explain && <div style={{ marginBottom: 12 }}>{desc.explain}</div>}
        <div ref={formKeys.ref} onKeyDown={formKeys.onKeyDown}>{formInner}</div>
      </div>
    </VWrap>
  );
}
