// ─── Inter-Branch (INB) Voucher — Daily Entry ─────────────────────────────────
// The SELLING branch raises an inter-branch sale: fares passed through at cost
// (→ Inter-Branch Sales), a transparent Service Fee (→ Service Fee Income, the
// margin), IGST on the fee. Posts via the standard sale pipeline and registers an
// open INB Link No the buying branch fetches into its SO/PO/GP purchase side.
import React, { useMemo, useState } from 'react';
import { bc } from '../core/styles';
import { localeOf } from '../core/format';
import { useCreateInb, useOpenInb } from '../core/useInterBranchVoucher';
import { toast } from '../core/ux/toast';

const C = { dark: '#0d1326', gold: '#d4a437', blue: '#185FA5', red: '#A32D2D', green: '#27500A', dim: '#5a6691', border: '#cdd1d8' };
const ALL_BRANCHES = ['BOM', 'AMD', 'NBO', 'DAR', 'FBM', 'BOMMB'];
// Tax jurisdiction per branch (mirror of the backend). Same country (India) = IGST
// taxable; different country = cross-border export (zero-rated) — EXCEPT BOM, which
// bills IGST on its service fee even to an African branch (seller-side only).
const COUNTRY = { BOM: 'IN', AMD: 'IN', BOMMB: 'IN', NBO: 'KE', DAR: 'TZ', FBM: 'FB' };
const inbTreatment = (from, to) => {
  const cf = COUNTRY[from] || 'IN'; const ct = COUNTRY[to] || 'IN';
  const crossBorder = cf !== ct;
  const zeroRated = crossBorder && from !== 'BOM'; // BOM bills IGST even cross-border
  return zeroRated
    ? { crossBorder, zeroRated: true, label: `Export · zero-rated (${cf}→${ct})` }
    : { crossBorder, zeroRated: false, label: crossBorder ? `IGST · inter-branch (${cf}→${ct}, 18% on Service Fee)` : 'IGST · inter-state (18% on Service Fee)' };
};
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const num = (x) => { const n = Number(x); return Number.isFinite(n) ? n : 0; };
const todayISO = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

export function InterBranchVoucher({ branch }) {
  const cur = (bc(branch) || {}).cur || '₹';
  const loc = localeOf(cur);
  const fromBranch = branch?.code || (typeof branch === 'string' ? branch : '') || '';
  const toOptions = ALL_BRANCHES.filter((b) => b !== fromBranch);

  const [form, setForm] = useState({
    toBranch: '', date: todayISO(), packageType: 'International',
    passenger: '', reference: '',
    base: '', k3: '', taxes: '', serviceFee: '',
  });
  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const treatment = inbTreatment(fromBranch, form.toBranch);
  // Tax on the Service Fee follows the SELLING branch's regime — IGST 18% for an
  // India (GST) branch, the branch VAT rate for a VAT branch — instead of a flat 18%.
  const fromCfg = bc(branch) || {};
  const isVat = fromCfg.taxType === 'VAT';
  const taxRate = isVat ? (Number(fromCfg.vatRate) || 16) : 18;
  const taxName = isVat ? 'VAT' : 'IGST';
  const treatmentLabel = treatment.zeroRated
    ? treatment.label
    : `${taxName} · ${treatment.crossBorder ? 'inter-branch' : (isVat ? 'domestic' : 'inter-state')} (${taxRate}% on Service Fee)`;
  const fares = r2(num(form.base) + num(form.k3) + num(form.taxes));
  const svc = r2(num(form.serviceFee));
  const igst = treatment.zeroRated ? 0 : r2(svc * taxRate / 100); // export → zero-rated; BOM cross-border → IGST
  const total = r2(fares + svc + igst);

  const create = useCreateInb();
  const openQ = useOpenInb(branch); // INB legs others sent TO this branch (info)
  const incoming = openQ.data || [];

  const inp = { padding: '6px 9px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12.5 };
  const card = { background: '#fff', border: `1px solid ${C.border}`, borderRadius: 9, padding: 14, marginBottom: 12 };
  const lbl = { fontSize: 11, color: C.dim, fontWeight: 700, display: 'block', marginBottom: 3 };
  const valid = fromBranch && form.toBranch && form.date && total > 0;

  const submit = () => {
    if (!valid) return;
    create.mutate({
      fromBranch, toBranch: form.toBranch, date: form.date,
      packageType: form.packageType, passenger: form.passenger, reference: form.reference,
      fareLines: [
        { ledger: 'Inter-Branch Sales', amt: num(form.base), desc: 'Base Fare', meta: { 'Base Fare': num(form.base) } },
        { ledger: 'Inter-Branch Sales', amt: num(form.k3), desc: 'K3', meta: { K3: num(form.k3) } },
        { ledger: 'Inter-Branch Sales', amt: num(form.taxes), desc: 'Taxes', meta: { Taxes: num(form.taxes) } },
      ].filter((l) => l.amt),
      serviceFee: svc, taxRate, gstMode: 'inter',
    }, {
      onSuccess: (res) => {
        toast(`Inter-branch sale posted · ${res?.inbLinkNo || ''}`, 'success');
        setForm((s) => ({ ...s, passenger: '', reference: '', base: '', k3: '', taxes: '', serviceFee: '' }));
      },
      onError: (e) => toast(e?.message || 'Failed to post', 'error'),
    });
  };

  return (
    <div style={{ margin: 12, maxWidth: 980 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: C.dark }}>Inter-Branch (INB) Voucher</div>
        <div style={{ fontSize: 12, color: C.dim }}>From <b>{fromBranch || '—'}</b> · sell to another branch · fares pass through at cost, Service Fee is your margin (IGST on the fee)</div>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div><label style={lbl}>To Branch</label>
            <select value={form.toBranch} onChange={(e) => set('toBranch', e.target.value)} style={{ ...inp, minWidth: 130 }}>
              <option value="">Select…</option>
              {toOptions.map((b) => <option key={b} value={b}>{b}</option>)}
            </select></div>
          <div><label style={lbl}>Date</label><input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Package</label>
            <select value={form.packageType} onChange={(e) => set('packageType', e.target.value)} style={inp}>
              <option>International</option><option>Domestic</option>
            </select></div>
          <div style={{ flex: 1, minWidth: 160 }}><label style={lbl}>Passenger</label><input value={form.passenger} onChange={(e) => set('passenger', e.target.value)} style={{ ...inp, width: '100%', boxSizing: 'border-box' }} placeholder="optional" /></div>
          <div style={{ minWidth: 140 }}><label style={lbl}>Reference</label><input value={form.reference} onChange={(e) => set('reference', e.target.value)} style={{ ...inp, width: '100%', boxSizing: 'border-box' }} placeholder="ticket / PNR" /></div>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 11, fontWeight: 800, color: C.dim, textTransform: 'uppercase', marginBottom: 8 }}>Fares (pass-through at cost) + Service Fee</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {[['base', 'Base Fare'], ['k3', 'K3'], ['taxes', 'Taxes'], ['serviceFee', 'Service Fee (margin)']].map(([k, label]) => (
            <div key={k}><label style={lbl}>{label}</label>
              <input type="number" min="0" value={form[k]} onChange={(e) => set(k, e.target.value)} placeholder="0" style={{ ...inp, width: 120, textAlign: 'right' }} /></div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 18, marginTop: 12, fontSize: 12.5, color: C.dark, flexWrap: 'wrap' }}>
          <span>Fares: <b>{cur}{fares.toLocaleString(loc)}</b></span>
          <span>Service Fee: <b>{cur}{svc.toLocaleString(loc)}</b></span>
          {treatment.zeroRated
            ? <span style={{ color: C.blue }}>Tax: <b>Export · zero-rated</b></span>
            : <span>{taxName} ({taxRate}% on fee): <b>{cur}{igst.toLocaleString(loc)}</b></span>}
          <span style={{ marginLeft: 'auto', fontWeight: 800 }}>Total: {cur}{total.toLocaleString(loc)}</span>
        </div>
      </div>

      <div style={{ ...card, background: '#f7f9fc' }}>
        <div style={{ fontSize: 11, color: C.dim }}>Posts in {fromBranch || 'your branch'}:</div>
        <div style={{ fontSize: 12, fontFamily: 'monospace', color: C.dark, marginTop: 4, lineHeight: 1.7 }}>
          Dr&nbsp; Travkings Tours &amp; Travels {form.toBranch || '<branch>'} &nbsp; {cur}{total.toLocaleString(loc)}<br />
          &nbsp;&nbsp;&nbsp;Cr&nbsp; Inter-Branch Sales (fares) &nbsp; {cur}{fares.toLocaleString(loc)}<br />
          &nbsp;&nbsp;&nbsp;Cr&nbsp; Service Fee Income &nbsp; {cur}{svc.toLocaleString(loc)}<br />
          {treatment.zeroRated
            ? <span style={{ color: C.blue }}>&nbsp;&nbsp;&nbsp;(export — zero-rated, no output tax)</span>
            : <>&nbsp;&nbsp;&nbsp;Cr&nbsp; Output {taxName} &nbsp; {cur}{igst.toLocaleString(loc)}</>}
        </div>
        <div style={{ fontSize: 11, color: form.toBranch ? (treatment.zeroRated ? C.blue : C.green) : C.dim, marginTop: 6 }}>
          {form.toBranch ? `Tax treatment: ${treatmentLabel}` : 'Select a destination branch to see the tax treatment'}
        </div>
      </div>

      <button onClick={submit} disabled={!valid || create.isPending}
        style={{ padding: '9px 18px', fontSize: 13, fontWeight: 700, border: 'none', borderRadius: 7, cursor: 'pointer', color: '#fff', background: C.green, opacity: (!valid || create.isPending) ? 0.6 : 1 }}>
        {create.isPending ? 'Posting…' : 'Post Inter-Branch Sale'}
      </button>
      <span style={{ fontSize: 11, color: C.dim, marginLeft: 12 }}>Creates the INB Link No; the buying branch fetches it on its SO/PO/GP purchase side.</span>

      {incoming.length > 0 && (
        <div style={{ ...card, marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.dim, textTransform: 'uppercase', marginBottom: 8 }}>Open inter-branch legs sent TO {fromBranch} ({incoming.length}) — book these on SO/PO/GP</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr style={{ textAlign: 'left', color: C.dim }}>
              <th style={{ padding: '4px 8px' }}>INB Link No</th><th style={{ padding: '4px 8px' }}>From</th><th style={{ padding: '4px 8px' }}>Date</th><th style={{ padding: '4px 8px' }}>Passenger</th><th style={{ padding: '4px 8px', textAlign: 'right' }}>Total</th></tr></thead>
            <tbody>
              {incoming.map((l) => (
                <tr key={l.inbLinkNo} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: '4px 8px', fontFamily: 'monospace', color: C.blue }}>{l.inbLinkNo}</td>
                  <td style={{ padding: '4px 8px' }}>{l.fromBranch}</td>
                  <td style={{ padding: '4px 8px' }}>{l.date}</td>
                  <td style={{ padding: '4px 8px' }}>{l.passenger || '—'}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{cur}{r2(l.total).toLocaleString(loc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
