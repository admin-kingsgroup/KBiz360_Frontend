import React, { useEffect, useMemo, useRef, useState } from 'react';
import { card, inp } from '../../core/styles';
import { localeOf } from '../../core/format';
import { bookingTravelDetail } from '../../core/registerSearch';
import { isVatBranch } from '../../core/voucherSpecs';
import { openPrintPreview } from '../../core/PrintPreview';
import { clickable } from '../../core/ux/clickable';
import { SmartDateInput } from '../../core/ux/SmartDateInput';
import { toast } from '../../core/ux/toast';
import { PeriodBar } from '../../core/period';
import {
  useTrialBalance, useProfitAndLoss, useBalanceSheet,
  useLedgerStatement, useChartOfAccounts,
  useVoucher, useUpdateVoucher, useCostCenters, useVoucherPreview,
} from '../../core/useAccounting';
import { VoucherShell } from '../../core/voucher/VoucherShell';
import { JvBlock } from '../../core/voucher/JvBlock';
import { editorVoucherTotal } from '../../core/voucher/ui';
import { hasRegistry } from '../../core/voucher/registry';
import { useVoucherRevoke, voucherParent, openParentFile } from '../../core/voucher/useRevokeAction';
import {
  DARK, GOLD, DIM, BLUE, RED, GREEN, curOf, money, branchLabel, Page, Banner, State,
  Th, headRow, rowBg, num, productOf, Crumb, todayISO,
} from './shared';

const DateInput = (props) => <input type="date" {...props} className="max-tablet:min-h-[44px]" style={{ ...inp, width: 140, minHeight: 32, fontSize: 11 }} />;


// Reusable per-voucher detail: header chips + every line's full meta breakup
// (base fare, K3, taxes, service charge, CGST/SGST/IGST, SVC2, TCS …).
export function VoucherLines({ voucher: v, cur }) {
  // Full-JV preview: the SAME engine the edit screen uses, so the popup shows the
  // COMPLETE balanced journal (party Dr, every component head, GST, TCS/TDS) for both
  // Sales and Purchase — not just the captured component lines. The hook must run
  // unconditionally (rules of hooks); it's gated to a real voucher with a category.
  const pv = useVoucherPreview(v && v.category ? v : null).data || {};
  if (!v) return null;
  // The shared `money` renders 0 as '—'; the JV must show a real ₹0 on the empty side
  // so EVERY ledger is visible with an explicit amount.
  const money0 = (n) => cur + Math.round(Number(n) || 0).toLocaleString(localeOf(cur));
  const F = ({ label, val }) => (
    <div style={{ minWidth: 110 }}>
      <div style={{ fontSize: 9, color: DIM, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
      <div style={{ fontSize: 12, color: DARK, fontWeight: 600 }}>{val || '—'}</div>
    </div>
  );
  const jvTh = { textAlign: 'left', padding: '5px 8px', color: DIM, fontSize: 10, whiteSpace: 'nowrap' };
  const lockedByBooking = v.locked && v.source === 'booking';
  const postings = pv.postings || [];
  return (
    <>
      {lockedByBooking && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: '#fbeedb', border: '1px solid #f3d9a8', color: '#d97706', fontSize: 11.5, fontWeight: 600 }}>
          🔒 Locked — driven by booking <b>{v.bookingId}</b>. Edit it on the SO / PO / GP booking (this Sales/Purchase voucher is read-only).
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 12 }}>
        <F label="Voucher" val={v.vno} /><F label="Date" val={v.date} /><F label="Branch" val={v.branch} />
        <F label={v.category === 'purchase' ? 'Supplier' : 'Customer'} val={v.party} />
        <F label="Link No" val={v.linkNo} /><F label="Taxable" val={money(cur, v.subtotal)} />
        <F label="SVF GST" val={money(cur, v.taxAmt)} />{Number(v.otherTaxesGst) > 0 && <F label="SVC2 GST" val={money(cur, v.otherTaxesGst)} />}<F label="Total" val={money(cur, v.total)} />
      </div>
      {postings.length > 0 ? (
        // Full journal — every ledger, both sides; a zero side shows ₹0 (dimmed), never hidden.
        <div style={{ ...card, padding: 10, marginBottom: 10, boxShadow: 'none', border: '1px solid #dfe2e7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontWeight: 700, color: DARK, fontSize: 12 }}>Full Journal Entry — every ledger this hits</div>
            {typeof pv.balanced === 'boolean' && <span style={{ fontSize: 11, fontWeight: 800, color: pv.balanced ? GREEN : RED }}>{pv.balanced ? '✓ Balanced' : `✗ Out by ${money0(pv.diff)}`}</span>}
          </div>
          <JvBlock postings={postings} />
        </div>
      ) : (
        // Fallback when the preview is unavailable: the captured component-head lines.
        // Skip object-valued meta so internal detail never renders as "[object Object]".
        (v.lines || []).map((ln, i) => {
          const meta = ln.meta && typeof ln.meta === 'object' ? ln.meta : {};
          const entries = Object.entries(meta).filter(([, val]) => val !== '' && val != null && typeof val !== 'object');
          return (
            <div key={i} style={{ ...card, padding: 12, marginBottom: 10, boxShadow: 'none', border: '1px solid #dfe2e7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: entries.length ? 8 : 0 }}>
                <span style={{ fontWeight: 700, color: DARK, fontSize: 12.5 }}>{ln.ledger || `Line ${i + 1}`}</span>
                <span style={{ fontWeight: 700, color: BLUE, fontVariantNumeric: 'tabular-nums' }}>{money0(ln.amt)}</span>
              </div>
              {entries.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '4px 14px' }}>
                  {entries.map(([k, val]) => (
                    <div key={k} style={{ fontSize: 11 }}>
                      <span style={{ color: DIM }}>{k}: </span><span style={{ color: DARK, fontWeight: 600 }}>{String(val)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
      {v.remarks && <div style={{ fontSize: 11, color: DIM }}>Remarks: {v.remarks}</div>}
    </>
  );
}


// Voucher type → product bucket (for the register's product filter).


const intDomOf = (v, booking) => {
  const pt = booking?.packageType || '';
  if (/int/i.test(pt)) return 'INT';
  if (/dom/i.test(pt)) return 'DOM';
  const ld = (v.lines || []).map((l) => l.ledger || '').join(' ');
  if (/(^|\s)IT-|International/i.test(ld)) return 'INT';
  if (/(^|\s)DT-|Domestic/i.test(ld)) return 'DOM';
  return '';
};







/* ════════════════════ DRILL-DOWN: group → ledger → voucher (editable) ═══ */
const tapRow = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '11px 14px', minHeight: 44, cursor: 'pointer', borderBottom: '1px solid #dfe2e7', WebkitTapHighlightColor: 'transparent' };

// Editable voucher view (the last drill step). Saving re-posts the journal.
export function VoucherEditor({ voucherId, cur, onBack, onClose }) {
  const vq = useVoucher(voucherId);
  const upd = useUpdateVoucher();
  const { canRevoke, doRevoke, revoking } = useVoucherRevoke();
  const v = vq.data;
  // Cost centres are branch-wise — only offer THIS voucher's branch's centres
  // (e.g. BOM-FLT-INT), never another branch's, so the tag can't be mismatched.
  const ccq = useCostCenters(v && v.branch);
  const chart = useChartOfAccounts(v && v.branch);
  const ledgerNames = (chart.data || []).map((l) => l.name).filter(Boolean);
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(false); // after a successful save → show the entry preview
  const dismiss = () => (onClose || onBack || (() => {}))();
  useEffect(() => {
    if (v) {
      setForm({
        date: v.date || '', branch: v.branch || '', party: v.party || '',
        taxAmt: v.taxAmt ?? 0, tdsAmt: v.tdsAmt ?? 0, tcsAmt: v.tcsAmt ?? 0, linkNo: v.linkNo || '', costCenter: v.costCenter || '', remarks: v.remarks || '',
        lines: (v.lines && v.lines.length ? v.lines : [{ ledger: '', amt: 0, drCr: 'Dr' }]).map((l) => ({ ...l, ledger: l.ledger || '', amt: Number(l.amt) || 0, drCr: l.drCr || 'Dr' })),
      });
      setMsg('');
    }
  }, [v]);
 
  const subtotal = r2((form?.lines || []).reduce((s, l) => s + (l.drCr === 'Cr' ? -1 : 1) * (Number(l.amt) || 0), 0));
 
  const total = editorVoucherTotal({ subtotal, taxAmt: form?.taxAmt, otherTaxesGst: v?.otherTaxesGst, tcsAmt: form?.tcsAmt, roundOff: v?.roundOff });
  const previewBody = (v && form) ? {
    ...v, branch: form.branch, party: form.party, taxAmt: Number(form.taxAmt) || 0,
    tdsAmt: Number(form.tdsAmt) || 0, tcsAmt: Number(form.tcsAmt) || 0, subtotal, total,
    lines: form.lines.filter((l) => l.ledger).map((l) => ({ ...l, amt: Number(l.amt) || 0 })),
  } : null;
  const pv = useVoucherPreview(previewBody).data || {};
  if (vq.isLoading || !form) return <div style={{ padding: 24, textAlign: 'center', color: DIM }}>Loading voucher...</div>;
  if (vq.isError) return <div style={{ padding: 16, color: RED }}>! {vq.error?.message}</div>;
  // Option C: categories with a registry entry render through the unified shell so
  // editing matches the create screen. Others fall back to this generic editor.
  if (hasRegistry(v.category)) {
    return <VoucherShell category={v.category} mode="edit" voucher={v} voucherId={voucherId} cur={cur} onBack={onBack} onClose={onClose} />;
  }
  const set = (k, val) => setForm((f) => ({ ...f, [k]: val }));
  const setLine = (i, k, val) => setForm((f) => ({ ...f, lines: f.lines.map((l, j) => (j === i ? { ...l, [k]: val } : l)) }));
  const addLine = () => setForm((f) => ({ ...f, lines: [...f.lines, { ledger: '', amt: 0, drCr: 'Dr' }] }));
  const delLine = (i) => setForm((f) => ({ ...f, lines: f.lines.filter((_, j) => j !== i) }));
  const dlId = 'vl-' + voucherId;
  const lab = { fontSize: 10, color: DIM, fontWeight: 700, marginBottom: 3 };
  const fld = { ...inp, fontSize: 12.5 };
  const save = () => {
    setMsg('');
    const lines = form.lines.filter((l) => l.ledger).map((l) => ({ ...l, amt: Number(l.amt) || 0, ledger: l.ledger, drCr: l.drCr || 'Dr' }));
    const body = { ...v, date: form.date, branch: form.branch, party: form.party, linkNo: form.linkNo, costCenter: form.costCenter, remarks: form.remarks, taxAmt: Number(form.taxAmt) || 0, tdsAmt: Number(form.tdsAmt) || 0, tcsAmt: Number(form.tcsAmt) || 0, subtotal, total, lines, status: v.status || 'saved' };
    delete body.id; delete body.createdAt; delete body.updatedAt;
    upd.mutate({ id: voucherId, body }, {
      onSuccess: () => { setMsg('saved'); setDone(true); toast(`Voucher ${v.vno} saved`); },
      onError: (e) => { setMsg('err:' + e.message); toast(`Could not save — ${e.message}`, 'error'); },
    });
  };
  // Build a printable A4 view of the full journal entry and hand it to the print preview.
  const printEntry = () => {
    const fmt = (n) => { const x = Math.round(Number(n) || 0); return x ? cur + x.toLocaleString(localeOf(cur)) : ''; };
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const rows = (pv.postings || []).map((p) => `<tr>
      <td>${esc(p.ledger)}</td><td>${esc(p.group || '')}</td>
      <td class="r">${fmt(p.debit)}</td><td class="r">${fmt(p.credit)}</td></tr>`).join('');
    const html = `<style>
      .ve{font-family:'Segoe UI',Arial,sans-serif;color:#1a1c22}
      .ve h1{font-size:16px;margin:0 0 2px}
      .ve .meta{font-size:10.5px;color:#5b616e;margin:0 0 4px}
      .ve table{width:100%;border-collapse:collapse;font-size:10.5px;margin-top:8px}
      .ve th{background:#1a1c22;color:#c2a04a;text-align:left;padding:6px 8px;font-size:9.5px}
      .ve th.r,.ve td.r{text-align:right}
      .ve td{padding:5px 8px;border-bottom:1px solid #dfe2e7}
      .ve tfoot td{background:#f3f5f9;font-weight:800;border-top:2px solid #1a1c22}
    </style>
    <div class="ve">
      <h1>Voucher — ${esc(v.vno)}</h1>
      <p class="meta">${esc(v.type)} · ${esc(v.category)} · ${esc(form.date)} · ${esc(form.branch)}${form.party ? ' · ' + esc(form.party) : ''}</p>
      ${form.remarks ? `<p class="meta">${esc(form.remarks)}</p>` : ''}
      <table>
        <thead><tr><th>Ledger</th><th>Group</th><th class="r">Debit</th><th class="r">Credit</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="2">Total</td><td class="r">${fmt(pv.totalDebit)}</td><td class="r">${fmt(pv.totalCredit)}</td></tr></tfoot>
      </table>
    </div>`;
    openPrintPreview({ title: `Voucher — ${v.vno}`, recommend: 'portrait', html });
  };
  // Post-save: show the full journal entry with Print / Close. Close dismisses the modal.
  if (done) {
    return (
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontWeight: 800, color: GREEN, fontSize: 14 }}>✓ Saved — {v.vno}</div>
          <button onClick={dismiss} title="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: DIM, fontSize: 18 }}>✕</button>
        </div>
        <div style={{ fontSize: 11.5, color: DIM, marginBottom: 10 }}>
          {v.type} · {v.category} · {form.date} · {form.branch}{form.party ? ` · ${form.party}` : ''}
        </div>
        <div style={{ ...card, padding: 10, boxShadow: 'none', border: '1px solid #dfe2e7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontWeight: 700, color: DARK, fontSize: 12 }}>Full Journal Entry</div>
            <span style={{ fontSize: 11, fontWeight: 800, color: pv.balanced ? GREEN : RED }}>{pv.balanced ? '✓ Balanced' : `✗ Out by ${money(cur, pv.diff)}`}</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
            <thead><tr><th style={{ textAlign: 'left', padding: '5px 8px', color: DIM }}>Ledger</th><th style={{ textAlign: 'left', padding: '5px 8px', color: DIM }}>Group</th><th style={{ textAlign: 'right', padding: '5px 8px', color: DIM }}>Debit</th><th style={{ textAlign: 'right', padding: '5px 8px', color: DIM }}>Credit</th></tr></thead>
            <tbody>
              {(pv.postings || []).map((p, i) => (<tr key={i} style={{ borderBottom: '1px solid #dfe2e7' }}><td style={{ padding: '5px 8px', fontWeight: 600, color: DARK }}>{p.ledger}</td><td style={{ padding: '5px 8px', color: DIM }}>{p.group}</td><td style={{ padding: '5px 8px', textAlign: 'right', color: BLUE }}>{p.debit ? money(cur, p.debit) : ''}</td><td style={{ padding: '5px 8px', textAlign: 'right', color: RED }}>{p.credit ? money(cur, p.credit) : ''}</td></tr>))}
            </tbody>
            <tfoot><tr style={{ fontWeight: 800, background: '#f3f5f9' }}><td style={{ padding: '6px 8px' }} colSpan={2}>Total</td><td style={{ padding: '6px 8px', textAlign: 'right', color: BLUE }}>{money(cur, pv.totalDebit)}</td><td style={{ padding: '6px 8px', textAlign: 'right', color: RED }}>{money(cur, pv.totalCredit)}</td></tr></tfoot>
          </table>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button onClick={printEntry} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, background: BLUE, color: '#fff' }}>🖨 Print</button>
          <button onClick={dismiss} style={{ padding: '10px 18px', borderRadius: 7, border: '1px solid #cdd1d8', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, background: '#fff', color: DARK }}>Close</button>
        </div>
      </div>
    );
  }
 
  if (v.status === 'approved' || v.status === 'saved' || v.status === 'posted') {
    const parent = voucherParent(v);
    return (
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontWeight: 800, color: DARK, fontSize: 14 }}>{v.vno} <span style={{ fontSize: 10, color: DIM, fontWeight: 600 }}>{v.type} - {v.category}</span></div>
          <button onClick={onBack} className="max-tablet:min-h-[44px]" style={{ ...inp, width: 'auto', minHeight: 34, fontSize: 11.5, cursor: 'pointer' }}>Back</button>
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 7, background: '#FBF3DE', border: '1px solid #e3cd97', color: '#8a6d12', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
          🔒 Approved &amp; posted — read-only. {parent ? <>It is a leg of its {parent.label} <b>{parent.ref}</b> — edit or revoke it there (the whole file is un-posted together), never the voucher alone.</> : <>To edit, <b>Revoke</b> it back to Pending in <b>Voucher Approvals</b> — the number is kept.</>}
        </div>
        <div style={{ fontSize: 11.5, color: DIM, marginBottom: 10 }}>{v.type} · {v.category} · {form.date} · {form.branch}{form.party ? ` · ${form.party}` : ''}</div>
        <div style={{ ...card, padding: 10, boxShadow: 'none', border: '1px solid #dfe2e7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontWeight: 700, color: DARK, fontSize: 12 }}>Full Journal Entry</div>
            <span style={{ fontSize: 11, fontWeight: 800, color: pv.balanced ? GREEN : RED }}>{pv.balanced ? '✓ Balanced' : `✗ Out by ${money(cur, pv.diff)}`}</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
            <thead><tr><th style={{ textAlign: 'left', padding: '5px 8px', color: DIM }}>Ledger</th><th style={{ textAlign: 'left', padding: '5px 8px', color: DIM }}>Group</th><th style={{ textAlign: 'right', padding: '5px 8px', color: DIM }}>Debit</th><th style={{ textAlign: 'right', padding: '5px 8px', color: DIM }}>Credit</th></tr></thead>
            <tbody>
              {(pv.postings || []).map((p, i) => (<tr key={i} style={{ borderBottom: '1px solid #dfe2e7' }}><td style={{ padding: '5px 8px', fontWeight: 600, color: DARK }}>{p.ledger}</td><td style={{ padding: '5px 8px', color: DIM }}>{p.group}</td><td style={{ padding: '5px 8px', textAlign: 'right', color: BLUE }}>{p.debit ? money(cur, p.debit) : ''}</td><td style={{ padding: '5px 8px', textAlign: 'right', color: RED }}>{p.credit ? money(cur, p.credit) : ''}</td></tr>))}
            </tbody>
            <tfoot><tr style={{ fontWeight: 800, background: '#f3f5f9' }}><td style={{ padding: '6px 8px' }} colSpan={2}>Total</td><td style={{ padding: '6px 8px', textAlign: 'right', color: BLUE }}>{money(cur, pv.totalDebit)}</td><td style={{ padding: '6px 8px', textAlign: 'right', color: RED }}>{money(cur, pv.totalCredit)}</td></tr></tfoot>
          </table>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          {parent && parent.navigable && <button onClick={() => { openParentFile(v); dismiss(); }} title={`Open its ${parent.label} ${parent.ref} — revoke the whole file there`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, background: '#A07828', color: '#fff' }}>⟲ Open {parent.label} →</button>}
          {canRevoke && !parent && <button onClick={() => doRevoke(voucherId, dismiss)} disabled={revoking} title="Revoke — un-post this voucher and return it to Pending so it can be edited & re-approved (number kept)" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 7, border: 'none', cursor: revoking ? 'not-allowed' : 'pointer', fontSize: 12.5, fontWeight: 700, background: '#A07828', color: '#fff', opacity: revoking ? 0.6 : 1 }}>⟲ {revoking ? 'Revoking…' : 'Revoke'}</button>}
          <button onClick={printEntry} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, background: BLUE, color: '#fff' }}>🖨 Print</button>
          <button onClick={dismiss} style={{ padding: '10px 18px', borderRadius: 7, border: '1px solid #cdd1d8', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, background: '#fff', color: DARK }}>Close</button>
        </div>
      </div>
    );
  }

  const paxRows = (v.lines || [])
    .map((l) => ({
      passenger: l.passenger || l.meta?.guest || '',
      ticket: l.ticket || '',
      airline: l.airline || '',
      sector: l.sector || '',
      cls: l.cls || '',
      pnr: l.pnr || '',
      travelDate: l.travelDate || '',
    }))
    .filter((p) => p.passenger || p.ticket || p.pnr || p.sector);
  return (
    <div style={{ padding: 14 }}>
      <datalist id={dlId}>{ledgerNames.map((n) => <option key={n} value={n} />)}</datalist>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontWeight: 800, color: DARK, fontSize: 14 }}>{v.vno} <span style={{ fontSize: 10, color: DIM, fontWeight: 600 }}>{v.type} - {v.category}</span></div>
        <button onClick={onBack} className="max-tablet:min-h-[44px]" style={{ ...inp, width: 'auto', minHeight: 34, fontSize: 11.5, cursor: 'pointer' }}>Back</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 10 }}>
        <div><div style={lab}>Date</div><SmartDateInput max={todayISO()} value={form.date} onChange={(iso) => set('date', iso)} style={fld} /></div>
        <div><div style={lab}>Branch</div><input value={form.branch} onChange={(e) => set('branch', e.target.value)} style={fld} /></div>
        <div><div style={lab}>{v.category === 'purchase' || v.category === 'purchase-expense' ? 'Supplier (party ledger)' : 'Customer / Party ledger'}</div><input list={dlId} value={form.party} onChange={(e) => set('party', e.target.value)} style={fld} /></div>
        <div><div style={lab}>Link No</div><input value={form.linkNo} onChange={(e) => set('linkNo', e.target.value)} style={fld} /></div>
        {(v.category === 'sale' || v.category === 'purchase') && (
          <div><div style={lab}>Cost Centre (module)</div>
            <select value={form.costCenter || ''} onChange={(e) => set('costCenter', e.target.value)} style={{ ...fld, cursor: 'pointer' }}>
              <option value="">- Unspecified -</option>
              {(ccq.data?.costCenters || []).map((c) => <option key={c.code} value={c.code}>{c.module} - {c.name}</option>)}
            </select>
          </div>
        )}
        <div><div style={lab}>GST / Tax</div><input type="number" value={form.taxAmt} onChange={(e) => set('taxAmt', e.target.value)} style={fld} /></div>
        <div><div style={lab}>TDS</div><input type="number" value={form.tdsAmt} onChange={(e) => set('tdsAmt', e.target.value)} style={fld} /></div>
        <div><div style={lab}>TCS</div><input type="number" value={form.tcsAmt} onChange={(e) => set('tcsAmt', e.target.value)} style={fld} /></div>
        <div><div style={lab}>Total (auto)</div><div style={{ ...fld, background: '#f3f5f9', color: DARK, fontWeight: 700 }}>{money(cur, total)}</div></div>
        <div><div style={lab}>Remarks</div><input value={form.remarks} onChange={(e) => set('remarks', e.target.value)} style={fld} /></div>
      </div>
      {paxRows.length > 0 && (
        <div style={{ ...card, padding: 10, marginTop: 12, boxShadow: 'none', border: '1px solid #dfe2e7' }}>
          <div style={{ fontWeight: 700, color: DARK, fontSize: 12, marginBottom: 8 }}>Passenger / Traveller Details</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
            <thead><tr>
              {['Passenger', 'Ticket', 'Airline', 'Sector', 'Class', 'PNR', 'Travel Date'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '5px 8px', color: DIM }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {paxRows.map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #dfe2e7' }}>
                  <td style={{ padding: '5px 8px', fontWeight: 600, color: DARK }}>{p.passenger || '—'}</td>
                  <td style={{ padding: '5px 8px', color: DIM }}>{p.ticket || '—'}</td>
                  <td style={{ padding: '5px 8px', color: DIM }}>{p.airline || '—'}</td>
                  <td style={{ padding: '5px 8px', color: DIM }}>{p.sector || '—'}</td>
                  <td style={{ padding: '5px 8px', color: DIM }}>{p.cls || '—'}</td>
                  <td style={{ padding: '5px 8px', color: DIM }}>{p.pnr || '—'}</td>
                  <td style={{ padding: '5px 8px', color: DIM }}>{p.travelDate || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ ...card, padding: 10, marginTop: 12, boxShadow: 'none', border: '1px solid #dfe2e7' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontWeight: 700, color: DARK, fontSize: 12 }}>Lines — pick ledger from Books (Dr / Cr)</div>
          <button onClick={addLine} className="max-tablet:min-h-[44px]" style={{ ...inp, width: 'auto', minHeight: 28, fontSize: 11, cursor: 'pointer' }}>+ Add line</button>
        </div>
      
        {form.lines.map((ln, i) => (
          <div key={i} className="mb-1.5 grid items-center gap-2 max-tablet:grid-cols-[80px_1fr_44px] tablet:grid-cols-[1fr_80px_120px_28px]">
            <input list={dlId} value={ln.ledger} placeholder="Ledger (from Books)" onChange={(e) => setLine(i, 'ledger', e.target.value)} className="max-tablet:col-span-3 max-tablet:min-h-[44px]" style={{ ...inp, fontSize: 12 }} />
            <select value={ln.drCr || 'Dr'} onChange={(e) => setLine(i, 'drCr', e.target.value)} className="max-tablet:min-h-[44px]" style={{ ...inp, fontSize: 12, cursor: 'pointer' }}><option value="Dr">Dr</option><option value="Cr">Cr</option></select>
            <input type="number" value={ln.amt} placeholder="Amount" onChange={(e) => setLine(i, 'amt', e.target.value)} className="max-tablet:min-h-[44px]" style={{ ...inp, fontSize: 12, textAlign: 'right' }} />
            <button onClick={() => delLine(i)} title="Remove line" className="inline-flex items-center justify-center max-tablet:min-h-[44px] max-tablet:min-w-[44px]" style={{ background: 'none', border: 'none', color: RED, cursor: 'pointer', fontWeight: 700 }}>x</button>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 18, marginTop: 6, fontSize: 12 }}>
          <span style={{ color: DIM }}>Lines subtotal: <b style={{ color: DARK }}>{money(cur, subtotal)}</b></span>
          <span style={{ color: DIM }}>+ Tax: <b style={{ color: DARK }}>{money(cur, Number(form.taxAmt) || 0)}</b></span>
          {(Number(v?.otherTaxesGst) || 0) > 0 && <span style={{ color: DIM }}>+ SVC2 GST: <b style={{ color: DARK }}>{money(cur, Number(v.otherTaxesGst) || 0)}</b></span>}
          {(Number(form.tcsAmt) || 0) > 0 && <span style={{ color: DIM }}>+ TCS: <b style={{ color: DARK }}>{money(cur, Number(form.tcsAmt) || 0)}</b></span>}
          <span style={{ color: DIM }}>= Total: <b style={{ color: DARK }}>{money(cur, total)}</b></span>
        </div>
      </div>
      <div style={{ ...card, padding: 10, marginTop: 12, boxShadow: 'none', border: '1px solid #dfe2e7' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontWeight: 700, color: DARK, fontSize: 12 }}>Accounting Effect — Full Journal (where this hits the books)</div>
          <span style={{ fontSize: 11, fontWeight: 800, color: pv.balanced ? GREEN : RED }}>{pv.error ? '⚠ ' + pv.error : pv.balanced ? '✓ Balanced' : `✗ Out by ${money(cur, pv.diff)}`}</span>
        </div>
        {pv.missing?.length > 0 && (
          <div style={{ margin: '0 0 8px', padding: '6px 9px', borderRadius: 6, background: '#fbe9e9', border: '1px solid #f3c9c9', color: '#d97706', fontSize: 11, fontWeight: 600 }}>
            ⚠ Ledger not in Chart of Accounts: <b>{pv.missing.join(', ')}</b>. Create it in Masters first — this voucher cannot be approved and stays <b>pending</b>. No ledger/sub-group/group is auto-created.
          </div>
        )}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead><tr><th style={{ textAlign: 'left', padding: '5px 8px', color: DIM }}>Ledger</th><th style={{ textAlign: 'left', padding: '5px 8px', color: DIM }}>Group</th><th style={{ textAlign: 'right', padding: '5px 8px', color: DIM }}>Debit</th><th style={{ textAlign: 'right', padding: '5px 8px', color: DIM }}>Credit</th></tr></thead>
          <tbody>
            {(pv.postings || []).map((p, i) => (<tr key={i} style={{ borderBottom: '1px solid #dfe2e7' }}><td style={{ padding: '5px 8px', fontWeight: 600, color: DARK }}>{p.ledger}</td><td style={{ padding: '5px 8px', color: DIM }}>{p.group}</td><td style={{ padding: '5px 8px', textAlign: 'right', color: BLUE }}>{p.debit ? money(cur, p.debit) : ''}</td><td style={{ padding: '5px 8px', textAlign: 'right', color: RED }}>{p.credit ? money(cur, p.credit) : ''}</td></tr>))}
            {!(pv.postings || []).length && <tr><td colSpan={4} style={{ padding: 12, textAlign: 'center', color: DIM }}>Pick ledgers / amounts to see the journal effect.</td></tr>}
          </tbody>
          <tfoot><tr style={{ fontWeight: 800, background: '#f3f5f9' }}><td style={{ padding: '6px 8px' }} colSpan={2}>Total</td><td style={{ padding: '6px 8px', textAlign: 'right', color: BLUE }}>{money(cur, pv.totalDebit)}</td><td style={{ padding: '6px 8px', textAlign: 'right', color: RED }}>{money(cur, pv.totalCredit)}</td></tr></tfoot>
        </table>
        <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 11, color: DIM }}>
          <span>GST: <b style={{ color: DARK }}>{money(cur, pv.tax?.gst || 0)}</b></span>
          <span>TDS: <b style={{ color: DARK }}>{money(cur, pv.tax?.tds || 0)}</b></span>
          <span>TCS: <b style={{ color: DARK }}>{money(cur, pv.tax?.tcs || 0)}</b></span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
        {/* Block Save only when the preview KNOWS it's unbalanced (=== false), so a
            slow/failed preview never locks the user out — the backend enforces balance too. */}
        {(() => {
          const blocked = pv.balanced === false;
          return (
            <button disabled={upd.isPending || blocked} onClick={save}
              title={blocked ? `Cannot save — debit and credit must match (out by ${money(cur, pv.diff)})` : 'Save voucher'}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 7, border: 'none', cursor: (upd.isPending || blocked) ? 'not-allowed' : 'pointer', fontSize: 12.5, fontWeight: 700, background: blocked ? '#9bbfa0' : GREEN, color: '#fff', opacity: blocked ? 0.75 : 1 }}>
              {upd.isPending ? 'Saving...' : 'Save'}
            </button>
          );
        })()}
        {pv.balanced === false && <span style={{ color: RED, fontSize: 11.5, fontWeight: 600 }}>Debit ≠ Credit — balance the entry to save (out by {money(cur, pv.diff)})</span>}
        {msg === 'saved' && <span style={{ color: GREEN, fontSize: 12, fontWeight: 700 }}>Saved & re-checked</span>}
        {msg.startsWith('err:') && <span style={{ color: RED, fontSize: 11.5 }}>! {msg.slice(4)}</span>}
      </div>
    </div>
  );
}

function DrillDown({ branch, group, onClose }) {
  const cur = curOf(branch);
  const [ledger, setLedger] = useState(null);
  const [voucher, setVoucher] = useState(null); // { id, vno }
  const tb = useTrialBalance(branch);
  const stmt = useLedgerStatement(ledger, branch);
  const groupLedgers = (tb.data?.rows || []).filter((r) => r.group === group);

  const crumbs = [
    { label: group, onClick: (ledger || voucher) ? () => { setLedger(null); setVoucher(null); } : null },
    ...(ledger ? [{ label: ledger, onClick: voucher ? () => setVoucher(null) : null }] : []),
    ...(voucher ? [{ label: voucher.vno }] : []),
  ];

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(16,18,22,0.5)', zIndex: 800, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '4vh 2vw' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: 'min(780px, 96vw)', maxHeight: '92vh', overflowY: 'auto', padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid #cdd1d8', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <Crumb items={crumbs} />
          <button onClick={onClose} className="inline-flex items-center justify-center max-tablet:min-h-[44px] max-tablet:min-w-[44px]" style={{ background: 'none', border: 'none', cursor: 'pointer', color: DIM, fontSize: 18, flexShrink: 0 }}>✕</button>
        </div>

        {voucher && <VoucherEditor voucherId={voucher.id} cur={cur} onBack={() => setVoucher(null)} onClose={onClose} />}

        {!voucher && ledger && (
          <div>
            {stmt.isLoading && <div style={{ padding: 24, textAlign: 'center', color: DIM }}>Loading…</div>}
            {stmt.data && <>
              <div style={{ padding: '8px 14px', background: '#f3f5f9', fontSize: 11, color: DIM, display: 'flex', justifyContent: 'space-between' }}>
                <span>Opening {money(cur, stmt.data.openingBalance)} {stmt.data.openingSide}</span>
                <span style={{ fontWeight: 700, color: DARK }}>Closing {money(cur, stmt.data.closingBalance)} {stmt.data.closingSide}</span>
              </div>
              {(stmt.data.lines || []).length === 0 && <div style={{ padding: 24, textAlign: 'center', color: DIM }}>No entries.</div>}
              {(stmt.data.lines || []).map((ln, i) => (
                <div key={i} style={tapRow} {...clickable(() => ln.voucherId && setVoucher({ id: ln.voucherId, vno: ln.vno }))}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: BLUE, fontWeight: 600 }}>{ln.vno} <span style={{ color: DIM, fontWeight: 400 }}>· {ln.date}</span></div>
                    <div style={{ fontSize: 10.5, color: DIM, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ln.narration || ln.party || ln.category}</div>
                  </div>
                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: ln.debit ? BLUE : RED }}>{ln.debit ? `Dr ${money(cur, ln.debit)}` : `Cr ${money(cur, ln.credit)}`}</div>
                    <div style={{ fontSize: 10, color: DIM }}>bal {money(cur, Math.abs(ln.balance))} {ln.balanceSide}</div>
                  </div>
                </div>
              ))}
            </>}
          </div>
        )}

        {!voucher && !ledger && (
          <div>
            <div style={{ padding: '8px 14px', fontSize: 11, color: DIM, background: '#f3f5f9' }}>{groupLedgers.length} ledger(s) in {group} — tap to open</div>
            {tb.isLoading && <div style={{ padding: 24, textAlign: 'center', color: DIM }}>Loading…</div>}
            {!tb.isLoading && groupLedgers.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: DIM }}>No ledgers in this group.</div>}
            {groupLedgers.map((r, i) => {
              // TB rows now expose closingDebit/closingCredit; fall back to the
              // legacy debit/credit shape if the backend isn't redeployed yet.
              const clDr = r.closingDebit != null ? r.closingDebit : r.debit;
              const clCr = r.closingCredit != null ? r.closingCredit : r.credit;
              return (
                <div key={i} style={tapRow} {...clickable(() => setLedger(r.ledger))}>
                  <span style={{ fontSize: 12.5, color: DARK, fontWeight: 600 }}>{r.ledger}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: clDr ? BLUE : RED, whiteSpace: 'nowrap' }}>{money(cur, clDr || clCr)} {clDr ? 'Dr' : 'Cr'}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════ Tally two-column (Dr | Cr) T-account ═════════ */
const r2 = (x) => Math.round((Number(x) || 0) * 100) / 100;
function TAccount({ leftHead = 'Particulars', rightHead = 'Particulars', left, right, leftTotal, rightTotal, cur, onPick }) {
  const n = Math.max(left.length, right.length, 1);
  const Label = ({ row }) => (row.group && onPick)
    ? <button onClick={() => onPick(row.group)} title="Drill into group" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: BLUE, fontWeight: row.bold ? 700 : 600, fontSize: 11.5, textAlign: 'left' }}>{row.label} ›</button>
    : <span style={{ color: '#2e323c', fontWeight: row.bold ? 700 : 400 }}>{row.label}</span>;
  const Cell = ({ row }) => row
    ? (<><td style={{ padding: '9px 14px' }}><Label row={row} /></td>
          <td style={{ padding: '9px 14px', ...num, color: DARK, fontWeight: row.bold ? 700 : 400 }}>{row.amount != null ? money(cur, row.amount) : ''}</td></>)
    : (<><td style={{ padding: '9px 14px' }} /><td style={{ padding: '9px 14px' }} /></>);
  return (
    <div className="kb-sticky" style={{ ...card, padding: 0, overflowX: 'auto', '--stick-head': DARK, '--stick-foot': DARK }}>
      <table style={{ width: '100%', minWidth: 520, borderCollapse: 'collapse', fontSize: 11.5, tableLayout: 'fixed' }}>
        <thead><tr style={headRow}>
          <Th>{leftHead}</Th><Th right>Amount</Th><Th>{rightHead}</Th><Th right>Amount</Th>
        </tr></thead>
        <tbody>
          {Array.from({ length: n }).map((_, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #dfe2e7', borderLeft: i === 0 ? 'none' : 'none' }}>
              <Cell row={left[i]} /><Cell row={right[i]} />
            </tr>
          ))}
        </tbody>
        <tfoot><tr style={{ background: DARK, borderTop: `2px solid ${GOLD}` }}>
          <td style={{ padding: '9px 14px', fontWeight: 700, color: GOLD }}>Total</td>
          <td style={{ padding: '9px 14px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, leftTotal)}</td>
          <td style={{ padding: '9px 14px', fontWeight: 700, color: GOLD }}>Total</td>
          <td style={{ padding: '9px 14px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, rightTotal)}</td>
        </tr></tfoot>
      </table>
    </div>
  );
}

/* ════════════════════ PROFIT & LOSS (Tally horizontal) ═════════════ */
export function ReportPnLLive({ branch }) {
  const cur = curOf(branch);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [drill, setDrill] = useState(null);
  const q = useProfitAndLoss(branch, { from, to });
  const d = q.data;
  const G = (g) => ({ label: g.group, amount: g.amount, group: g.group });

  let trade = null, pl = null;
  if (d) {
    const gp = d.grossProfit, np = d.netProfit;
    // Trading account → Gross Profit
    const tL = d.trading.debit.map(G), tR = d.trading.credit.map(G);
    if (gp >= 0) tL.push({ label: 'Gross Profit c/d', amount: gp, bold: true });
    else tR.push({ label: 'Gross Loss c/d', amount: -gp, bold: true });
    trade = { left: tL, right: tR, lt: r2(d.trading.debitTotal + Math.max(gp, 0)), rt: r2(d.trading.creditTotal + Math.max(-gp, 0)) };
    // Profit & Loss account → Net Profit
    const pL = d.indirect.debit.map(G); let pR = [];
    if (gp >= 0) pR.push({ label: 'Gross Profit b/d', amount: gp, bold: true });
    else pL.push({ label: 'Gross Loss b/d', amount: -gp, bold: true });
    pR = [...pR, ...d.indirect.credit.map(G)];
    if (np >= 0) pL.push({ label: 'Net Profit', amount: np, bold: true });
    else pR.push({ label: 'Net Loss', amount: -np, bold: true });
    pl = { left: pL, right: pR, lt: r2(d.indirect.debitTotal + Math.max(-gp, 0) + Math.max(np, 0)), rt: r2(Math.max(gp, 0) + d.indirect.creditTotal + Math.max(-np, 0)) };
  }

  return (
    <Page
      title="Profit & Loss Account"
      sub={`${branchLabel(branch)}${from || to ? ` · ${from || '…'} → ${to || '…'}` : ' · all periods'}`}
      right={<>
        <PeriodBar branch={branch} compact defaultPreset="all" onChange={(r) => { setFrom(r.from); setTo(r.to); }} />
      </>}
    >
      <State q={q} empty={!d}>
        {d && (
          <Banner tone={d.netProfit >= 0 ? 'ok' : 'err'}>
            {d.grossResult}: {money(cur, Math.abs(d.grossProfit))} · {d.result}: {money(cur, Math.abs(d.netProfit))}
          </Banner>
        )}
        {trade && <>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', color: BLUE, margin: '4px 0 6px' }}>Trading Account</div>
          <div style={{ marginBottom: 14 }}><TAccount left={trade.left} right={trade.right} leftTotal={trade.lt} rightTotal={trade.rt} cur={cur} onPick={setDrill} /></div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', color: BLUE, margin: '4px 0 6px' }}>Profit &amp; Loss Account</div>
          <TAccount left={pl.left} right={pl.right} leftTotal={pl.lt} rightTotal={pl.rt} cur={cur} onPick={setDrill} />
        </>}
      </State>
      {drill && <DrillDown branch={branch} group={drill} onClose={() => setDrill(null)} />}
    </Page>
  );
}

/* ════════════════════ BALANCE SHEET (Tally horizontal) ═════════════ */
export function ReportBSLive({ branch }) {
  const cur = curOf(branch);
  const [to, setTo] = useState('');
  const [drill, setDrill] = useState(null);
  const q = useBalanceSheet(branch, { to });
  const d = q.data;
  // Synthetic rows (P&L A/c, difference) aren't real groups → not drillable.
  const G = (g) => ({ label: g.group, amount: g.amount, bold: g.isResult, group: (g.isResult || g.group === 'Difference in Opening Balances') ? null : g.group });
  return (
    <Page
      title="Balance Sheet"
      sub={`${branchLabel(branch)}${to ? ` · as on ${to}` : ' · as on date'}`}
      right={<><span style={{ lineHeight: '32px', color: DIM, fontSize: 11 }}>As on</span><DateInput value={to} onChange={(e) => setTo(e.target.value)} /></>}
    >
      <State q={q} empty={!d}>
        {d && <Banner tone={d.balanced ? 'ok' : 'err'}>{d.balanced ? '✔ Balanced' : '⚠ Out of balance'} — Liabilities {money(cur, d.totalLiabilities)} {d.balanced ? '=' : '≠'} Assets {money(cur, d.totalAssets)}</Banner>}
        {d && <TAccount leftHead="Liabilities" rightHead="Assets" left={d.liabilities.map(G)} right={d.assets.map(G)} leftTotal={d.totalLiabilities} rightTotal={d.totalAssets} cur={cur} onPick={setDrill} />}
      </State>
      {drill && <DrillDown branch={branch} group={drill} onClose={() => setDrill(null)} />}
    </Page>
  );
}

const numOf = (n) => { const v = Number(n); return Number.isFinite(v) ? v : 0; };

function splitGst(amt, gstMode, brCode) {
  const a = r2(amt);
  if (!a) return { cgst: 0, sgst: 0, igst: 0, vat: 0 };
  if (isVatBranch(brCode)) return { cgst: 0, sgst: 0, igst: 0, vat: a };
  if (gstMode === 'inter') return { cgst: 0, sgst: 0, igst: a, vat: 0 };
  const half = r2(a / 2);
  return { cgst: half, sgst: r2(a - half), igst: 0, vat: 0 };
}

const HEAD_RANK = [
  [/base\s*fare/i, 0], [/land/i, 1], [/room|basic|visa\s*fee|premium|fare/i, 2],
  [/k3/i, 3], [/svc2|other\s*tax/i, 5], [/\bsvf\b|service\s*charge/i, 6], [/supp\s*svchg|supplier\s*service/i, 7],
  [/tax/i, 4], [/incentive/i, 8], [/tds/i, 9],
];
const headRank = (ledger) => { for (const [re, rk] of HEAD_RANK) if (re.test(ledger)) return rk; return 50; };


function captureTravel(v, booking) {
  if (booking) return bookingTravelDetail(booking);
  const names = [], tkts = [], pnrs = [];
  const push = (arr, x) => { const s = String(x == null ? '' : x).trim(); if (s && !arr.includes(s)) arr.push(s); };
  for (const p of (v.pax || [])) { push(names, p.name); push(tkts, p.ticket); push(pnrs, p.pnr); }
  for (const ln of (v.lines || [])) { push(names, ln.passenger); push(tkts, ln.ticket); push(pnrs, ln.pnr); }
  return { passengers: names.join(', '), tickets: tkts.join(', '), pnrs: pnrs.join(', ') };
}


export function buildCaptureSheet(vouchers, { tab, tag, linkIndex, bookingByLink, showType }) {
  const isSale = tab !== 'purchase';
  const taxWord = isSale ? 'Output' : 'Input';
  const sfx = tag ? ` [${tag}]` : '';
  const list = vouchers || [];

  // 1) Dynamic component-head columns = the union of every voucher line's ledger.
  const headSet = new Set();
  let anyInter = false, anyVat = false, anyIndia = false, anyOther = false, anyTcs = false, anyTds = false;
  for (const v of list) {
    for (const ln of (v.lines || [])) { if (ln && ln.ledger) headSet.add(ln.ledger); }
    if (isVatBranch(v.branch)) anyVat = true; else anyIndia = true;
    if (v.gstMode === 'inter') anyInter = true;
    if (numOf(v.otherTaxesGst) > 0) anyOther = true;
    if (numOf(v.tcsAmt) > 0) anyTcs = true;
    if (numOf(v.tdsAmt) > 0) anyTds = true;
  }
  const headLedgers = [...headSet].sort((a, b) => (headRank(a) - headRank(b)) || a.localeCompare(b));

  // 2) Assemble columns: fixed lead → component heads → taxes → final value.
  const columns = [];
  const col = (key, label, isNum) => columns.push({ key, label, num: !!isNum });
  // Lead columns, fixed business order: Date ▸ Sales Type ▸ Ledger ▸ Invoice Value
  // ▸ Link No ▸ Sales Invoice No ▸ Purchase Invoice No. Everything else trails after.
  col('saleDate', isSale ? 'Sale Date' : 'Purchase Date');
  col('salesType', isSale ? 'Sales Type' : 'Purchase Type'); // always shown (the register's type)
  col('clientLedger', isSale ? 'Client Ledger' : 'Vendor Ledger'); // the accounting ledger
  col('finalValue', isSale ? 'Final Invoice Value' : 'Final Bill Value', true);
  col('linkNo', 'SPG / Link No');
  col('saleVno', 'Sales Invoice No');
  col('purVno', 'Purchase Invoice No');
  // ── the rest ──
  col('bookingNo', 'Booking No');
  col('saleTallyRef', 'Sales Tally Ref');   // kept with the purchase ref, beside each other
  col('purTallyRef', 'Purchase Tally Ref');
  if (!tag) col('branch', 'Branch');
  if (showType) col('intDom', 'INT / DOM'); // International vs Domestic (All-modules view only)
  col('clientType', isSale ? 'Client Type' : 'Vendor Type');
  col('pax', 'Pax Details');
  col('pnr', 'PNR');
  col('ticket', 'Ticket No');
  for (const lg of headLedgers) col(`head:${lg}`, lg, true);
  if (anyIndia) { col('cgst', `CGST ${taxWord}${sfx}`, true); col('sgst', `SGST ${taxWord}${sfx}`, true); }
  if (anyInter) col('igst', `IGST ${taxWord}${sfx}`, true);
  if (anyVat) col('vat', `VAT ${taxWord}${sfx}`, true);
  if (isSale && anyOther) {
    if (anyIndia) { col('ocgst', `SVC2 CGST Output${sfx}`, true); col('osgst', `SVC2 SGST Output${sfx}`, true); }
    if (anyInter) col('oigst', `SVC2 IGST Output${sfx}`, true);
    if (anyVat) col('ovat', `SVC2 VAT Output${sfx}`, true);
  }
  if (isSale && anyTcs) col('tcs', 'TCS', true);
  if (!isSale && anyTds) col('tds', 'TDS', true);
  // Per-row printable invoice (Sales Invoice / Purchase Invoice) at the far end.
  col('invoice', isSale ? 'Sales Invoice' : 'Purchase Invoice');

  // 3) One row per voucher — pivot the lines into their head columns.
  const rows = list.map((v) => {
    const link = v.linkNo || '';
    const booking = (link && bookingByLink[link]) || null;
    const tv = captureTravel(v, booking);
    const g = splitGst(v.taxAmt, v.gstMode, v.branch);
    const og = splitGst(v.otherTaxesGst, v.gstMode, v.branch);
    const row = {
      _v: v,             // back-reference: Final Invoice Value → open this voucher's JV
      _booking: booking, // back-reference: print the Sales / Purchase invoice for this row
      bookingNo: (booking && booking.bookingNo) || '—',
      linkNo: link || '—',
      saleVno: isSale ? v.vno : (linkIndex.saleByLink[link] || ''),
      saleTallyRef: isSale ? (v.sourceRef || '') : ((linkIndex.saleRefByLink || {})[link] || ''),
      purVno: isSale ? (linkIndex.purByLink[link] || '') : v.vno,
      purTallyRef: isSale ? ((linkIndex.purRefByLink || {})[link] || '') : (v.sourceRef || ''),
      saleDate: v.date || '',
      branch: v.branch || '',
      salesType: productOf(v),
      intDom: intDomOf(v, booking),
      clientType: v.partyGroup || '',
      clientLedger: v.party || v.billTo || '',
      pax: tv.passengers || '', pnr: tv.pnrs || '', ticket: tv.tickets || '',
      // Refund vouchers NET their party leg in the posted JV, so the header `total`
      // (gross reversal) is NOT what hit the client ledger. `partyNet` (attached by
      // the backend from the posted journal) is that net figure — show it so the
      // column matches the JV popup / party ledger; absent (unposted) → total.
      finalValue: r2(v.partyNet != null ? v.partyNet : v.total),
      cgst: g.cgst, sgst: g.sgst, igst: g.igst, vat: g.vat,
      ocgst: og.cgst, osgst: og.sgst, oigst: og.igst, ovat: og.vat,
      tcs: r2(v.tcsAmt), tds: r2(v.tdsAmt),
    };
    for (const ln of (v.lines || [])) {
      if (!ln || !ln.ledger) continue;
      const k = `head:${ln.ledger}`;
      row[k] = r2(numOf(row[k]) + numOf(ln.amt));
    }
    return row;
  });

  // 4) Footer column totals for every numeric column.
  const totals = {};
  for (const c of columns) if (c.num) totals[c.key] = r2(rows.reduce((s, r) => s + numOf(r[c.key]), 0));
  return { columns, rows, totals };
}



/* ════════════════════ CASH BOOK (live) ═════════════════════════════
   A true Tally Cash Book: the ledger account of a Cash-in-Hand ledger.
   Opening b/d → every receipt (Dr) / payment (Cr) with a running balance →
   closing balance. Derived live from the ledger statement (full history fetched
   so the period opening is exact for any from/to), no demo data.            */
