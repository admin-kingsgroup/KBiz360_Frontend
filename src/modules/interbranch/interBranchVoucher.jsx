// ─── Inter-Branch (INB) Voucher — Daily Entry ─────────────────────────────────
// The SELLING branch raises an inter-branch sale: fares passed through at cost
// (→ Inter-Branch Sales), a transparent Service Fee (→ Service Fee Income, the
// margin), IGST on the fee. Posts via the standard sale pipeline and registers an
// open INB Link No the buying branch fetches into its SO/PO/GP purchase side.
import React, { useEffect, useMemo, useState } from 'react';
import { bc } from '../../core/styles';
import { localeOf } from '../../core/format';
import { useCreateInb, useOpenInb, usePairRate } from '../../core/useInterBranchVoucher';
import { toast } from '../../core/ux/toast';
import { Skeleton } from '../../shell/primitives';

const C = { dark: '#0d1326', gold: '#d4a437', blue: '#185FA5', red: '#A32D2D', green: '#27500A', dim: '#5a6691', border: '#cdd1d8', amber: '#8a6d00', amberBg: '#fff7e0' };
const ALL_BRANCHES = ['BOM', 'AMD', 'NBO', 'DAR', 'FBM', 'BOMMB'];
// Tax jurisdiction per branch (mirror of the backend). Same country (India) = IGST
// taxable; different country = cross-border export (zero-rated) — EXCEPT BOM, which
// bills IGST on its service fee even to an African branch (seller-side only).
const COUNTRY = { BOM: 'IN', AMD: 'IN', BOMMB: 'IN', NBO: 'KE', DAR: 'TZ', FBM: 'FB' };
// Book currency per branch (mirror of backend taxRegime.BOOK_CCY): India → INR, Africa → USD.
// When the two ends of an INB deal differ, the deal is CROSS-CURRENCY and needs a frozen FX
// rate so the receiving branch books in its own currency.
const BOOK_CCY = { BOM: 'INR', AMD: 'INR', BOMMB: 'INR', NBO: 'USD', DAR: 'USD', FBM: 'USD' };
const bookCcyOf = (b) => BOOK_CCY[b] || 'INR';
const CCY_SYM = { INR: '₹', USD: '$' };
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
    base: '', k3: '', taxes: '', serviceFee: '', fxRate: '',
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

  // ── Cross-currency FX (INR-branch ↔ USD-branch) ─────────────────────────────
  // The seller posts in ITS currency; when the buyer books in a different one the deal
  // needs a frozen USD→INR rate so the buyer captures its own currency. Same-currency
  // deals never see any of this.
  const sellerCcy = bookCcyOf(fromBranch);
  const buyerCcy = form.toBranch ? bookCcyOf(form.toBranch) : sellerCcy;
  const crossCcy = !!form.toBranch && sellerCcy !== buyerCcy;
  const rateQ = usePairRate(crossCcy ? 'USD' : null, crossCcy ? 'INR' : null, form.date);
  const dailyRate = rateQ.data && rateQ.data.set ? Number(rateQ.data.rate) : null;
  // Prefill the field from the daily rate once it loads (user can override); clear when the
  // deal turns same-currency.
  useEffect(() => {
    if (!crossCcy) { if (form.fxRate !== '') set('fxRate', ''); return; }
    if (form.fxRate === '' && dailyRate) set('fxRate', String(dailyRate));
  }, [crossCcy, dailyRate]); // eslint-disable-line react-hooks/exhaustive-deps
  const fxRate = num(form.fxRate);
  const convert = (amt, fromC, toC, rate) => {
    if (fromC === toC) return r2(amt);
    if (!(rate > 0)) return null;
    if (fromC === 'USD' && toC === 'INR') return r2(amt * rate);
    if (fromC === 'INR' && toC === 'USD') return r2(amt / rate);
    return null;
  };
  const buyerTotal = crossCcy ? convert(total, sellerCcy, buyerCcy, fxRate) : null;
  const buyerSym = CCY_SYM[buyerCcy] || '';
  const fxMissing = crossCcy && !(fxRate > 0);

  const create = useCreateInb();
  const openQ = useOpenInb(branch); // INB legs others sent TO this branch (info)
  const incoming = openQ.data || [];

  const inp = { padding: '6px 9px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12.5 };
  const card = { background: '#fff', border: `1px solid ${C.border}`, borderRadius: 9, padding: 14, marginBottom: 12 };
  const lbl = { fontSize: 11, color: C.dim, fontWeight: 700, display: 'block', marginBottom: 3 };
  const valid = fromBranch && form.toBranch && form.date && total > 0 && !fxMissing;

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
      // Freeze the FX quote on a cross-currency deal so the buyer branch books in its own
      // currency (base=USD, quote=INR); omitted for same-currency deals.
      ...(crossCcy ? { fx: { base: 'USD', quote: 'INR', rate: fxRate, date: form.date, fromCcy: sellerCcy, toCcy: buyerCcy, source: 'manual' } } : {}),
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

      {/* Inter-Branch FX Rate — ALWAYS shown so the rate field is discoverable. The
          input is ACTIVE only for a cross-currency deal (India ₹ ↔ Africa $); a
          same-currency deal shows a disabled field explaining why no rate is needed. */}
      <div style={{ ...card, background: !crossCcy ? '#f7f9fc' : (fxMissing ? C.amberBg : '#f4f8ff'), border: `1px solid ${!crossCcy ? C.border : (fxMissing ? C.amber : C.blue)}` }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: C.dim, textTransform: 'uppercase', marginBottom: 8 }}>
          Inter-Branch FX Rate{crossCcy ? ` · ${sellerCcy} → ${buyerCcy} (${form.toBranch} books in ${buyerCcy})` : ''}
        </div>
        {crossCcy ? (
          <>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div><label style={lbl}>Rate — 1 USD = ₹</label>
                <input type="number" min="0" step="0.0001" value={form.fxRate} onChange={(e) => set('fxRate', e.target.value)}
                  placeholder={dailyRate ? String(dailyRate) : '0'} style={{ ...inp, width: 130, textAlign: 'right' }} /></div>
              <div style={{ fontSize: 11.5, color: C.dim }}>
                {rateQ.isLoading ? <Skeleton className="inline-block h-3 w-20 align-middle" />
                  : dailyRate ? <>Daily rate {form.date}: <b>1 USD = ₹{dailyRate.toLocaleString(localeOf('₹'))}</b></>
                  : <span style={{ color: C.amber }}>No daily USD→INR rate set for {form.date} — enter one to post.</span>}
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 800, color: fxMissing ? C.amber : C.blue }}>
                {fxMissing ? 'Set the FX rate' : <>Buyer books ≈ {buyerSym}{(buyerTotal || 0).toLocaleString(localeOf(buyerSym), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>}
              </div>
            </div>
            <div style={{ fontSize: 11, color: C.dim, marginTop: 8 }}>
              Your legs post in {sellerCcy}; the frozen rate translates the deal so {form.toBranch}’s pending PO lands in {buyerCcy}. Books stay single-currency.
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div><label style={lbl}>Rate — 1 USD = ₹</label>
              <input disabled value="" placeholder="—" title="Only needed for a cross-currency (₹ ↔ $) deal"
                style={{ ...inp, width: 130, textAlign: 'right', background: '#eef1f5', color: C.dim, cursor: 'not-allowed' }} /></div>
            <div style={{ fontSize: 11.5, color: C.dim }}>
              {form.toBranch
                ? <><b>No FX needed</b> — {fromBranch} and {form.toBranch} both keep books in <b>{sellerCcy === 'INR' ? '₹ INR' : '$ USD'}</b>. A rate is required only when the two branches book in different currencies (an India branch ₹ ↔ an Africa branch $).</>
                : <>Pick a destination branch. If it books in a different currency (an India branch ₹ ↔ an Africa branch $), this <b>FX Rate</b> field activates so you can freeze the rate.</>}
            </div>
          </div>
        )}
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
              <th style={{ padding: '4px 8px' }}>INB Link No</th><th style={{ padding: '4px 8px' }}>From</th><th style={{ padding: '4px 8px' }}>Date</th><th style={{ padding: '4px 8px' }}>Passenger</th><th style={{ padding: '4px 8px', textAlign: 'right' }}>FX Rate</th><th style={{ padding: '4px 8px', textAlign: 'right' }}>Total</th></tr></thead>
            <tbody>
              {incoming.map((l) => {
                // The leg's total is in the SELLER's currency. This branch is the BUYER, so a
                // cross-currency leg is shown CONVERTED into our currency at its frozen rate —
                // that's what we'll actually book. Same-currency legs display as-is.
                const lfx = l.fx && Number(l.fx.rate) > 0 && l.fx.fromCcy !== l.fx.toCcy ? l.fx : null;
                const shown = lfx ? convert(r2(l.total), lfx.fromCcy, lfx.toCcy, Number(l.fx.rate)) : r2(l.total);
                const sym = lfx ? (CCY_SYM[lfx.toCcy] || cur) : cur;
                return (
                <tr key={l.inbLinkNo} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: '4px 8px', fontFamily: 'monospace', color: C.blue }}>{l.inbLinkNo}</td>
                  <td style={{ padding: '4px 8px' }}>{l.fromBranch}</td>
                  <td style={{ padding: '4px 8px' }}>{l.date}</td>
                  <td style={{ padding: '4px 8px' }}>{l.passenger || '—'}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: lfx ? C.blue : C.dim }}
                    title={lfx ? `Frozen at deal creation (${lfx.fromCcy}→${lfx.toCcy})` : 'Same-currency deal — no FX'}>
                    {lfx ? `1 USD = ₹${Number(l.fx.rate).toLocaleString(localeOf('₹'), { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : '—'}
                  </td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                    title={lfx ? `${CCY_SYM[lfx.fromCcy] || ''}${r2(l.total).toLocaleString()} @ 1 USD = ₹${Number(l.fx.rate).toLocaleString()}` : undefined}>
                    {sym}{(shown == null ? r2(l.total) : shown).toLocaleString(localeOf(sym))}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
