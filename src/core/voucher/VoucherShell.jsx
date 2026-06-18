import React, { useState } from 'react';
import { useVoucherPreview, useCreateVoucher, useUpdateVoucher } from '../useAccounting';
import { openPrintPreview } from '../PrintPreview';
import { bc, VWrap, VHead, FL, inp, card, btnG, btnGh } from '../styles';
import { VOUCHER_REGISTRY } from './registry';
import { DARK, DIM, BLUE, RED, GREEN, money, brCodeOf, escHtml } from './ui';
import { useFormKeys } from '../ux/forms';
import { toast } from '../ux/toast';
import { Kbd } from '../ux/widgets.jsx';
import { isViewOnly } from '../api';

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
  const desc = VOUCHER_REGISTRY[category];
  const isEdit = mode === 'edit';

  const branchCode = isEdit ? (voucher?.branch || null) : brCodeOf(branch);
  const cur = curProp || bc(branch)?.cur || '₹';
  const editId = isEdit ? (voucherId || voucher?.id || voucher?._id) : undefined;
  const ctx = { branch: isEdit ? (voucher?.branch || branch) : branch, branchCode, cur, editId };

  const [state, setState] = useState(() => (isEdit && voucher ? desc.fromVoucher(voucher, ctx) : desc.initial(ctx)));
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const createMut = useCreateVoucher();
  const updateMut = useUpdateVoucher();
  const saving = createMut.isPending || updateMut.isPending;

  // Live, backend-computed journal — identical engine for create and edit.
  const previewBody = { ...desc.toBody(state, ctx) };
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
    const base = desc.toBody(state, ctx);
    const ok = (vno) => { setDone(true); toast(`${desc.label} saved${vno ? ` — ${vno}` : ''}`); };
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

  const printEntry = () => {
    const fmt = (n) => { const x = Math.round(Number(n) || 0); return x ? cur + x.toLocaleString('en-IN') : ''; };
    const rows = (pv.postings || []).map((p) => `<tr><td>${escHtml(p.ledger)}</td><td>${escHtml(p.group || '')}</td><td class="r">${fmt(p.debit)}</td><td class="r">${fmt(p.credit)}</td></tr>`).join('');
    const html = `<style>
      .ve{font-family:'Segoe UI',Arial,sans-serif;color:#0d1326}
      .ve h1{font-size:16px;margin:0 0 2px}
      .ve .meta{font-size:10.5px;color:#5a6691;margin:0 0 4px}
      .ve table{width:100%;border-collapse:collapse;font-size:10.5px;margin-top:8px}
      .ve th{background:#0d1326;color:#d4a437;text-align:left;padding:6px 8px;font-size:9.5px}
      .ve th.r,.ve td.r{text-align:right}
      .ve td{padding:5px 8px;border-bottom:1px solid #eceef4}
      .ve tfoot td{background:#f3f5f9;font-weight:800;border-top:2px solid #0d1326}
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
    <div style={{ ...card, padding: 10, marginTop: 12, boxShadow: 'none', border: '1px solid #eef1f6' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontWeight: 700, color: DARK, fontSize: 12 }}>Accounting Effect — Full Journal (where this hits the books)</div>
        <span style={{ fontSize: 11, fontWeight: 800, color: pv.balanced ? GREEN : RED }}>{pv.error ? '⚠ ' + pv.error : pv.balanced ? '✓ Balanced' : `✗ Out by ${money(cur, pv.diff)}`}</span>
      </div>
      {pv.missing?.length > 0 && (
        <div style={{ margin: '0 0 8px', padding: '6px 9px', borderRadius: 6, background: '#FCEBEB', border: '1px solid #F7C1C1', color: '#854F0B', fontSize: 11, fontWeight: 600 }}>
          ⚠ Ledger not in Chart of Accounts: <b>{pv.missing.join(', ')}</b>. Create it in Masters first.
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
        <thead><tr><th style={{ textAlign: 'left', padding: '5px 8px', color: DIM }}>Ledger</th><th style={{ textAlign: 'left', padding: '5px 8px', color: DIM }}>Group</th><th style={{ textAlign: 'right', padding: '5px 8px', color: DIM }}>Debit</th><th style={{ textAlign: 'right', padding: '5px 8px', color: DIM }}>Credit</th></tr></thead>
        <tbody>
          {(pv.postings || []).map((p, i) => (<tr key={i} style={{ borderBottom: '1px solid #f2f4f8' }}><td style={{ padding: '5px 8px', fontWeight: 600, color: DARK }}>{p.ledger}</td><td style={{ padding: '5px 8px', color: DIM }}>{p.group}</td><td style={{ padding: '5px 8px', textAlign: 'right', color: BLUE }}>{p.debit ? money(cur, p.debit) : ''}</td><td style={{ padding: '5px 8px', textAlign: 'right', color: RED }}>{p.credit ? money(cur, p.credit) : ''}</td></tr>))}
          {!(pv.postings || []).length && <tr><td colSpan={4} style={{ padding: 12, textAlign: 'center', color: DIM }}>Pick ledgers / amounts to see the journal effect.</td></tr>}
        </tbody>
        <tfoot><tr style={{ fontWeight: 800, background: '#f3f5f9' }}><td style={{ padding: '6px 8px' }} colSpan={2}>Total</td><td style={{ padding: '6px 8px', textAlign: 'right', color: BLUE }}>{money(cur, pv.totalDebit)}</td><td style={{ padding: '6px 8px', textAlign: 'right', color: RED }}>{money(cur, pv.totalCredit)}</td></tr></tfoot>
      </table>
    </div>
  );

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
          <button onClick={printEntry} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, background: BLUE, color: '#fff' }}>🖨 Print</button>
          {isEdit
            ? <button onClick={dismiss} style={{ padding: '10px 18px', borderRadius: 7, border: '1px solid #d6dbe6', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, background: '#fff', color: DARK }}>Close</button>
            : <button onClick={reset} style={{ ...btnG }}>＋ New Voucher</button>}
        </div>
      </div>
    );
    if (isEdit) return doneInner;
    return <VWrap title={desc.label} icon={desc.icon} vNo="Auto" branch={branch}>{doneInner}</VWrap>;
  }

  // ── the editable form ──────────────────────────────────────────────
  const formInner = (
    <>
      {desc.fields({ state, setState, ctx })}
      {journalTable}
      {!branchCode && !isEdit && <div style={{ padding: '8px 12px', borderRadius: 8, background: '#FAEEDA', fontSize: 10.5, color: '#854F0B', fontWeight: 600, textAlign: 'center', margin: '10px 0' }}>Select a specific branch (not “All”) to post this voucher.</div>}
      {err && <div style={{ padding: '8px 12px', borderRadius: 8, background: '#FCEBEB', fontSize: 11, color: RED, fontWeight: 600, margin: '10px 0' }}>! {err}</div>}
      {viewOnly && <div style={{ padding: '8px 12px', borderRadius: 8, background: '#FAEEDA', fontSize: 10.5, color: '#854F0B', fontWeight: 600, textAlign: 'center', margin: '10px 0' }}>View only — this account can review vouchers but cannot post them.</div>}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
        {!isEdit && <button onClick={reset} style={btnGh}>Reset</button>}
        {isEdit && <button onClick={dismiss} style={btnGh}>Back</button>}
        <button onClick={save} disabled={!canSave} title={viewOnly ? 'View only — changes are not allowed' : 'Save (Ctrl/Cmd+Enter)'} style={{ ...btnG, background: canSave ? '#185FA5' : '#bfc3d6', opacity: canSave ? 1 : 0.6, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          {desc.icon} Save Voucher {saving ? '…' : val.hint} {!saving && <Kbd>⌃↵</Kbd>}
        </button>
      </div>
    </>
  );

  if (isEdit) {
    return (
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontWeight: 800, color: DARK, fontSize: 14 }}>{voucher.vno} <span style={{ fontSize: 10, color: DIM, fontWeight: 600 }}>{voucher.type} - {voucher.category}</span></div>
        </div>
        <div ref={formKeys.ref} onKeyDown={formKeys.onKeyDown}>{formInner}</div>
      </div>
    );
  }
  return (
    <VWrap title={desc.label} icon={desc.icon} vNo="Auto" branch={branch}>
      <VHead vNo="Auto" />
      <div style={{ padding: '14px 16px' }}>
        {desc.explain && <div style={{ marginBottom: 12 }}>{desc.explain}</div>}
        <div ref={formKeys.ref} onKeyDown={formKeys.onKeyDown}>{formInner}</div>
      </div>
    </VWrap>
  );
}
