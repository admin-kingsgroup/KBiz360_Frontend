// ─── SO / PO / GP Voucher (approval-gated) ────────────────────────────────────
// Travkings-style combined voucher across all 7 modules. The user fills the
// Purchase grid (cost) + per-line markup & service charge; the Sales side derives,
// Gross Profit shows live. Saving creates a PENDING voucher — NO books impact.
// It then appears under Pending; an approver reviews the full JV (which ledger,
// which group, Dr/Cr) and Approves & Posts → that spawns the linked LOCKED Sales
// + Purchase vouchers (and their double-entry), and it moves to Approved. One
// Link No ties SO/PO/GP so profit is tracked invoice-wise.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, Trash2, Save, ArrowRight, Check, Lock, RefreshCw, Clock, CheckCircle2,
  XCircle, ChevronDown, ChevronRight, Link2, FileCheck2, Pencil, RotateCcw,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { inp, card, btnG, btnGh, FL, bc } from '../../core/styles.jsx';
import { localeOf } from '../../core/format';
import { todayISO } from '../../core/dates';
import { PeriodBar, periodRange } from '../../core/period';
import { printBookingInvoice } from '../../core/printInvoice';
import { apiGet, apiPost, apiPut } from '../../core/api';
import { useOpenInb, useBookInb, useCreateInb } from '../../core/useInterBranchVoucher';
import { useVNo } from '../../core/useNextNo';

// Inter-branch jurisdiction (mirror of backend): same country (India) = IGST;
// different country = cross-border export (zero-rated on the seller side).
const INB_COUNTRY = { BOM: 'IN', AMD: 'IN', BOMMB: 'IN', NBO: 'KE', DAR: 'TZ', FBM: 'FB' };
const INB_ALL = ['BOM', 'AMD', 'NBO', 'DAR', 'FBM', 'BOMMB'];
const inbCrossBorder = (from, to) => (INB_COUNTRY[from] || 'IN') !== (INB_COUNTRY[to] || 'IN');
import { AuditTrail } from '../../core/AuditTrail';
import { useLedgerRegistry } from '../../core/useReference';
import { useFormKeys } from '../../core/ux/forms';
import { toast } from '../../core/ux/toast';
import { confirmDialog } from '../../core/ux/confirm';
import { clickable } from '../../core/ux/clickable';
import { listKeyNav } from '../../core/ux/listKeys';
import { usePager, Pager } from '../../core/ux/pager';
import { SmartDateInput } from '../../core/ux/SmartDateInput';
import { JvBlock } from '../../core/voucher/JvBlock';
import {
  VSPECS, VMODULE_LIST, blankLine, blankSector, normalizeLine, syncLineRefs, bookingTotals, lineCalc, isVatBranch, rowsFromSnapshots,
} from '../../core/voucherSpecs.js';
import { RefundReissueFields } from '../../core/voucher/fields/RefundReissueFields';
import { invalidateBooks } from '../../core/useAccounting';

const GOLD = '#A07828', DARK = '#141414', DR = '#1A7A42', CR = '#C0392B', BLUE = '#2563eb';
// Gold theme tokens + per-section bar accents (SO / PO / GP voucher theme).
const GOLD_DEEP = '#6B4E0F', GOLD_SOFT = '#FBF3DE', GOLD_LINE = '#E8D9A8';
const HELV = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const SO_BAR = '#1D4E89', PO_BAR = '#8A1F3D', GP_BAR = GOLD;
// Reversal modules (Refund / Reissue) act on an existing sale — picked from the same
// module bar as Flight/Hotel, but they open the reversal entry (ReversalEntry) instead
// of the fare grid and spawn one RF/RI voucher on approval.
const REVERSAL_CHIPS = [{ code: 'RF', name: 'Refund', icon: '↩️' }, { code: 'RI', name: 'Reissue', icon: '🔁' }];
const isReversalModule = (m) => m === 'RF' || m === 'RI';
const brCodeOf = (branch) => (branch === 'ALL' ? null : (branch?.code || 'BOM'));
// A supplier attracts Indian 194H TDS only when it is an Indian vendor (blank country =
// India default). Mirrors the backend isIndia() in shared/util/gstSupplyType so the live
// PO grid drops the 2% TDS for a foreign supplier exactly as the posted journal does.
const isIndiaCountry = (c) => { const s = String(c || '').trim().toLowerCase(); return s === '' || s === 'india' || s === 'in' || s === 'bharat'; };
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => Number(Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/* shared cell styles */
const thM = { padding: '10px 8px', fontSize: 10.5, fontWeight: 700, letterSpacing: '.5px', color: '#334155', textTransform: 'uppercase', textAlign: 'right', whiteSpace: 'nowrap', borderBottom: '2px solid #cdd1d8', background: '#f8fafc' };
const thA = { padding: '10px 8px', fontSize: 10.5, fontWeight: 700, letterSpacing: '.5px', color: GOLD, textTransform: 'uppercase', textAlign: 'right', whiteSpace: 'nowrap', borderBottom: '2px solid #f2e6cc', background: '#fdfbfa' };
const thL = { textAlign: 'left' };
const tdC = { padding: '6px 8px', fontSize: 12, textAlign: 'right', borderBottom: '1px solid #cdd1d8', fontVariantNumeric: 'tabular-nums', verticalAlign: 'middle' };
const tdAuto = { ...tdC, background: '#faf7ef', color: '#5b616e', fontWeight: 600 };
const tdTot = { ...tdC, fontWeight: 800, color: DARK };
const cellInp = { width: '100%', boxSizing: 'border-box', padding: '6px 8px', fontSize: 12, textAlign: 'right', border: '1px solid #cdd1d8', borderRadius: 8, background: '#fff', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' };
const cellTxt = { width: '100%', boxSizing: 'border-box', padding: '6px 8px', fontSize: 12, textAlign: 'left', border: '1px solid #cdd1d8', borderRadius: 8, background: '#fff', fontFamily: 'inherit', fontWeight: 600, outline: 'none', transition: 'border-color 0.2s' };
const tfTd = { borderTop: '2px solid ' + DARK, padding: '10px 8px', fontWeight: 800, fontSize: 12, background: '#f1f5f9', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: DARK };
// Per-section column-header + total-row styles — the section colour carries INTO
// the table (SO blue, PO maroon), matching the SO/PO/GP voucher theme.
const thBaseHdr = { padding: '10px 8px', fontSize: 10.5, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' };
// Header text-align matches the column's data alignment (right for the numeric
// fare/GST/total cells, left for the name/reference text cells) — otherwise the
// centred header text visually drifts away from the right-aligned figures below it.
const soHdr = { ...thBaseHdr, color: '#fff', background: 'linear-gradient(180deg, ' + SO_BAR + ' 0%, #163d6c 100%)', borderBottom: '2px solid ' + SO_BAR, whiteSpace: 'normal', lineHeight: 1.3, textAlign: 'right' };
const soHdrL = { ...soHdr, textAlign: 'left' };
const poHdr = { ...thBaseHdr, color: '#fff', background: 'linear-gradient(180deg, ' + PO_BAR + ' 0%, #6f1830 100%)', borderBottom: '2px solid ' + PO_BAR, whiteSpace: 'normal', lineHeight: 1.3, textAlign: 'right' };
const poHdrL = { ...poHdr, textAlign: 'left' };
const soTf = { ...tfTd, background: '#DCE8F4', color: SO_BAR, borderTop: '2px solid ' + SO_BAR };
const poTf = { ...tfTd, background: '#FBEEF2', color: PO_BAR, borderTop: '2px solid ' + PO_BAR };

/* ════════════════════════════════════════════════════════════════════════════
   SO / PO / GP Voucher entry
   ════════════════════════════════════════════════════════════════════════════ */
// Load a saved booking row into the Edit grid. For non-package modules every GST
// cell (input GST, service GST, markup GST) is auto-computed and read-only, so drop
// psvcGst / svcGst / mkGst on load → opening Edit RECOMPUTES all GST from the current
// premium/fare, supplier service, service charge and markup (markup is GST-inclusive
// at the module rate). This keeps GST always correct and prevents a suppressed
// (e.g. 0) markup GST being carried forward. Holiday package keeps its manual GST.
function loadLineForEdit(spec, row) {
  const line = normalizeLine(spec, row);
  if (spec && spec.model === 'package') return line;
  const { psvcGst, svcGst, mkGst, ...rest } = line;
  return rest;
}

// Rebuild the entry grid for an existing booking. Prefer the full per-line `rows`
// grid. Bulk-imported / migrated bookings (e.g. Tally summaries) often carry only
// the so/po/gp totals with an EMPTY `rows`, which used to open Edit as a blank grid
// — every figure the user had on the voucher "disappeared". Reconstruct each line
// from the so/po snapshots instead (rowsFromSnapshots). GST is dropped
// (loadLineForEdit) and recomputed from the rebuilt fares on save, so totals stay
// correct. Falls back to a single blank line only when there is no per-line detail.
export function rowsForEdit(spec, booking) {
  const rows = (booking && Array.isArray(booking.rows)) ? booking.rows : [];
  if (rows.length) return rows.map((r) => loadLineForEdit(spec, r));
  const rebuilt = rowsFromSnapshots(booking);
  if (rebuilt.length) return rebuilt.map((r) => loadLineForEdit(spec, r));
  return [blankLine(spec)];
}

// ── N-PO (Phase 2): additional purchase legs under one booking/Link No ────────
// Flight (SF) may add ONE Misc PO; Holiday (SH) may add legs of ANY module type;
// Visa (SV) may add another Visa (multi-country), Misc (courier/VFS) or Insurance.
// Each leg carries its own module/supplier/cost-centre/ref/cost grid → its own
// Purchase voucher on approval; the sale stays single. blank leg → dropped on save.
export const ALLOWED_LEG_MODULES = { SF: ['SM'], SH: ['SF', 'SHT', 'SC', 'SV', 'SI', 'SM'], SV: ['SV', 'SM', 'SI'] };
const newLeg = (module) => ({ module, supplier: { name: '', ledgerGroup: '' }, costCenter: '', purTallyRef: '', gstMode: 'intra', packageType: '', availItc: false, line: blankLine(VSPECS[module] || VSPECS.SM) });
const legsFromEdit = (booking) => (booking.purchases || []).map((leg) => {
  const sp = VSPECS[leg.module] || VSPECS.SM;
  return {
    module: leg.module, supplier: { name: leg.supplier?.ledgerName || leg.supplier?.name || '', ledgerGroup: leg.supplier?.ledgerGroup || '' },
    costCenter: leg.costCenter || '', purTallyRef: leg.purTallyRef || '', gstMode: leg.gstMode || 'intra',
    packageType: leg.packageType || '', availItc: !!leg.availItc,
    line: (Array.isArray(leg.rows) && leg.rows[0]) ? { ...blankLine(sp), ...leg.rows[0] } : blankLine(sp),
  };
});
export function legToPayload(leg, brCode, noVat, foreign = false) {
  const spec = VSPECS[leg.module] || VSPECS.SM;
  const { po } = bookingTotals(spec, [leg.line], { branch: brCode, noVat, availItc: leg.availItc, packageType: leg.packageType, foreignSupplier: foreign });
  return {
    module: leg.module,
    supplier: { name: leg.supplier.name, ledgerName: leg.supplier.name, ledgerGroup: leg.supplier.ledgerGroup },
    costCenter: leg.costCenter, purTallyRef: leg.purTallyRef, gstMode: leg.gstMode,
    packageType: leg.packageType, availItc: leg.availItc, po: { ...po, gstMode: leg.gstMode }, rows: [leg.line],
  };
}

function ExtraPurchases({ parentModule, branch, brCode, noVat, legs, onChange, isForeign }) {
  const allowed = ALLOWED_LEG_MODULES[parentModule];
  if (!allowed) return null;
  const setLeg = (i, patch) => onChange(legs.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const setLine = (i, key, val) => setLeg(i, { line: { ...legs[i].line, [key]: val } });
  const setModule = (i, m) => onChange(legs.map((l, idx) => (idx === i ? { ...newLeg(m), supplier: l.supplier, costCenter: l.costCenter, purTallyRef: l.purTallyRef } : l)));
  const del = (i) => onChange(legs.filter((_, idx) => idx !== i));
  const add = () => onChange([...legs, newLeg(allowed[0])]);
  const cell = { width: 90, padding: '5px 7px', border: '1px solid #cdd1d8', borderRadius: 5, fontSize: 12 };
  return (
    <div style={{ ...card, marginTop: 14, marginBottom: 14, borderColor: '#cdb46a' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <strong style={{ fontSize: 13, color: '#6b5a1e' }}>➕ Additional Purchases (N-PO)</strong>
        <span style={{ fontSize: 11, color: '#9A9A9A' }}>{parentModule === 'SF' ? 'Flight may add a Misc cost leg' : 'Holiday package — add any component (flight/hotel/car/visa/insurance/misc)'} · one Link No, separate supplier invoice each</span>
        <button type="button" onClick={add} style={{ ...btnGh, marginLeft: 'auto', padding: '5px 11px', fontSize: 11 }}>+ Add PO</button>
      </div>
      {legs.length === 0 && <p style={{ margin: 0, fontSize: 11.5, color: '#9A9A9A' }}>No extra purchase legs. The sale stays a single invoice; add a PO to attach another supplier cost under this Link No.</p>}
      {legs.map((leg, i) => {
        const spec = VSPECS[leg.module] || VSPECS.SM;
        const pkg = spec.model === 'package';
        const po = legToPayload(leg, brCode, noVat, isForeign ? isForeign(leg.supplier.name) : false).po;
        return (
          <div key={i} style={{ padding: 11, marginBottom: 10, background: '#fffdf7', border: '1px solid #eee3cf', borderRadius: 7 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
              <strong style={{ fontSize: 12 }}>PO #{i + 1}</strong>
              <select value={leg.module} onChange={(e) => setModule(i, e.target.value)} style={{ ...cell, width: 'auto' }}>
                {allowed.map((m) => <option key={m} value={m}>{VSPECS[m].name}</option>)}
              </select>
              <div style={{ minWidth: 220 }}>
                <PartyPicker branch={branch} kind="supplier" value={{ name: leg.supplier.name, group: leg.supplier.ledgerGroup }}
                  onChange={(v) => setLeg(i, { supplier: { name: v.name, ledgerGroup: v.group } })} />
              </div>
              <input value={leg.costCenter} onChange={(e) => setLeg(i, { costCenter: e.target.value.toUpperCase() })} placeholder="Cost Centre" style={{ ...cell, width: 120 }} />
              <input value={leg.purTallyRef} onChange={(e) => setLeg(i, { purTallyRef: e.target.value })} placeholder="Supplier Inv. No (Tally ref)" style={{ ...cell, width: 170 }} />
              {/* VAT has no intra/inter split — hidden on Africa branches. */}
              {!isVatBranch(brCode) && <select value={leg.gstMode} onChange={(e) => setLeg(i, { gstMode: e.target.value })} style={{ ...cell, width: 'auto' }}><option value="intra">Intra (CGST+SGST)</option><option value="inter">Inter (IGST)</option></select>}
              <button type="button" onClick={() => del(i)} style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', color: '#c0392b', fontSize: 16 }} title="Remove leg">×</button>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              {spec.fareCols.map((fc) => (
                <label key={fc.key} style={{ fontSize: 10.5, color: '#5b616e' }}>{fc.label}<br />
                  <input type="number" min="0" value={leg.line[fc.key] ?? ''} onChange={(e) => setLine(i, fc.key, e.target.value)} style={cell} /></label>
              ))}
              <label style={{ fontSize: 10.5, color: '#5b616e' }}>Supplier Service Charge<br />
                <input type="number" min="0" value={leg.line.psvc ?? ''} onChange={(e) => setLine(i, 'psvc', e.target.value)} style={cell} /></label>
              {pkg && <label style={{ fontSize: 10.5, color: '#5b616e' }}>Supplier Service Charge {isVatBranch(brCode) ? 'VAT' : 'GST'}<br />
                <input type="number" min="0" value={leg.line.psvcGst ?? ''} onChange={(e) => setLine(i, 'psvcGst', e.target.value)} style={cell} /></label>}
              <label style={{ fontSize: 10.5, color: '#5b616e' }}>Supp Comm/Inc Rcvd<br />
                <input type="number" min="0" value={leg.line.incentive ?? ''} onChange={(e) => setLine(i, 'incentive', e.target.value)} style={cell} /></label>
              {pkg && <span style={{ fontSize: 10, color: '#6b5a1e', fontStyle: 'italic', alignSelf: 'flex-end', paddingBottom: 8 }}>Supplier {isVatBranch(brCode) ? 'VAT' : 'GST'} auto-claimed as ITC</span>}
              <div style={{ marginLeft: 'auto', paddingBottom: 4, fontSize: 12, fontWeight: 700, color: '#1a1c22' }}>Net payable {bc({ code: brCode }).cur}{fmt(po.total)}{num(po.gst) > 0 ? ` · ITC ${bc({ code: brCode }).cur}${fmt(po.gst)}` : ''}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SoPoGpVoucherEntry({ branch, setRoute, editBooking = null, onDone = null, initialModule = null, interBranch = false }) {
  const qc = useQueryClient();
  const editing = !!editBooking;
  // Editing keeps the booking's own branch; a fresh voucher uses the top-bar branch.
  const brCode = editing ? (editBooking.branch || brCodeOf(branch)) : brCodeOf(branch);
  const cur = bc(editing ? { code: editBooking.branch } : branch).cur;
  // Live preview of the next Link No (LK series) shown in the Link band instead of the
  // old static "Auto" — advisory; the real Link No is assigned atomically on save.
  const nextLinkNo = useVNo(editing ? { code: editBooking.branch } : branch, 'LK');

  const initModule = (editing && (VSPECS[editBooking.module] || isReversalModule(editBooking.module))) ? editBooking.module
    : (initialModule && (VSPECS[initialModule] || isReversalModule(initialModule))) ? initialModule : 'SF';
  const [moduleCode, setModuleCode] = useState(initModule);
  // RF/RI are reversal modules with no fare-grid spec — fall back to SF so the
  // (unused) fare-grid hooks below stay safe; the reversal entry is rendered via an
  // early return before any of the fare-grid UI shows.
  const specRaw = VSPECS[moduleCode] || VSPECS.SF;
  // Africa/VAT branches don't levy India's K3 (airline) tax on international air — drop
  // the K3 fare column so the whole SO/PO/GP grid (header/body/footer/sectors/GP) hides
  // it consistently. K3 is always 0 there, so the totals & posted heads are unchanged.
  const spec = isVatBranch(brCode) && (specRaw.fareCols || []).some((c) => c.key === 'k3')
    ? { ...specRaw, fareCols: specRaw.fareCols.filter((c) => c.key !== 'k3') }
    : specRaw;

  const [lines, setLines] = useState(() => {
    if (editing) return rowsForEdit(VSPECS[initModule] || VSPECS.SF, editBooking);
    return [blankLine(VSPECS.SF)];   // start blank — no demo rows
  });
  const [date, setDate] = useState(editing ? (editBooking.date || today()) : today());
  const [travelDate, setTravelDate] = useState(editing ? (editBooking.travelDate || '') : '');
  const [headerRef, setHeaderRef] = useState(editing ? (editBooking.headerRef || '') : '');
  const [customer, setCustomer] = useState(editing
    ? { name: editBooking.customer?.name || '', gstin: editBooking.customer?.gstin || '', address: editBooking.customer?.address || '', email: editBooking.customer?.email || '', contact: editBooking.customer?.contact || '', group: editBooking.customer?.group || '', ledgerName: editBooking.customer?.ledgerName || '', ledgerGroup: editBooking.customer?.ledgerGroup || '' }
    : { name: '', gstin: '', address: '', email: '', contact: '', group: '', ledgerName: '', ledgerGroup: '' });
  const [supplier, setSupplier] = useState(editing
    ? { name: editBooking.supplier?.name || '', gstin: editBooking.supplier?.gstin || '', address: editBooking.supplier?.address || '', email: editBooking.supplier?.email || '', contact: editBooking.supplier?.contact || '', ledgerGroup: editBooking.supplier?.ledgerGroup || '' }
    : { name: '', gstin: '', address: '', email: '', contact: '', ledgerGroup: '' });

  const [clientType, setClientType] = useState(editing ? (editBooking.customer?.ledgerGroup || '') : '');
  const reg = useLedgerRegistry(branch).data || [];
  // Foreign-supplier resolver (mirrors the backend's countryFromSupplierMaster): match the
  // chosen creditor ledger to its master row by exact name and read its home country — a
  // foreign vendor (e.g. IATA-BSP / Singapore) can't withhold Indian 194H TDS, so the 2%
  // TDS on its incentive is dropped here too, keeping the grid in step with the books.
  const supplierMaster = useQuery({ queryKey: ['suppliers'], queryFn: () => apiGet('/api/suppliers') }).data || [];
  const supplierCountryBy = useMemo(() => {
    const m = new Map();
    (supplierMaster || []).forEach((s) => { if (s && s.name) m.set(s.name.trim().toLowerCase(), s.country || ''); });
    return m;
  }, [supplierMaster]);
  const countryOfSupplier = (name) => supplierCountryBy.get(String(name || '').trim().toLowerCase()) || '';
  const isForeignSupplier = (name) => !isIndiaCountry(countryOfSupplier(name));
  const suppForeign = isForeignSupplier(supplier.name);
  const clientTypes = useMemo(() => {
    const set = new Set();
    reg.forEach((l) => {
      if (l.type === 'Debtor' && l.group && l.group.trim().toLowerCase() === 'sundry debtors') {
        const sg = l.subGroup;
        if (sg) set.add(sg);
      }
    });
    return Array.from(set).sort();
  }, [reg]);

  const handleClientTypeChange = (ct) => {
    setClientType(ct);
    if (ct && customer.ledgerGroup && customer.ledgerGroup !== ct) {
      setCustomer({ name: '', gstin: '', address: '', email: '', contact: '', group: '', ledgerName: '', ledgerGroup: '' });
    }
  };
  // No-supplier mode (Misc only): a sale with no purchase leg — full sale value is
  // income. Hides the Purchase Order + supplier fields and posts only the sale.
  const [noSupplier, setNoSupplier] = useState(editing ? !!editBooking.noSupplier : false);
  // Without-VAT mode (Africa/VAT branches only): zero-rate the booking tax (e.g.
  // international air). Ignored on India branches (they always follow module GST).
  const [noVat, setNoVat] = useState(editing ? !!editBooking.noVat : false);
  // GST mode is set per leg: place of supply can differ (in-state sale → intra,
  // out-of-state supplier purchase → inter). Default sale=intra; on edit, prefer the
  // leg's own stored mode, falling back to the legacy booking-level gstMode.
  const [saleGstMode, setSaleGstMode] = useState(editing ? (editBooking.so?.gstMode || editBooking.gstMode || 'intra') : 'intra');
  const [purGstMode, setPurGstMode] = useState(editing ? (editBooking.po?.gstMode || editBooking.gstMode || 'intra') : 'intra');
  // No silent default — the user MUST consciously pick International vs Domestic
  // (that choice IS the cost centre). A blank leaves it untagged: it still saves as
  // Pending but the approval gate refuses to post it until it's tagged.
  const [packageType, setPackageType] = useState(editing ? (editBooking.packageType || '') : '');
  const [remarks, setRemarks] = useState(editing ? (editBooking.remarks || '') : '');
  // Free-text Tally references (optional) → flow to the spawned Sale / Purchase voucher sourceRef.
  const [saleTallyRef, setSaleTallyRef] = useState(editing ? (editBooking.saleTallyRef || '') : '');
  const [purTallyRef, setPurTallyRef] = useState(editing ? (editBooking.purTallyRef || '') : '');
  // N-PO (Phase 2): additional purchase legs (Flight +Misc / Holiday components).
  const [extraPOs, setExtraPOs] = useState(editing ? legsFromEdit(editBooking) : []);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  // Inter-branch (INB): the PO can fetch an open INB leg sent to this branch — it
  // pre-fills the supplier (the selling branch) + fares + Service Fee, and on save
  // the link is marked booked (consumed). inbLinkNo holds the fetched link.
  const [inbLinkNo, setInbLinkNo] = useState(''); // display (INB Link No)
  const [inbId, setInbId] = useState('');         // the InbLink _id (API target)
  const openInbQ = useOpenInb(branch);
  const bookInb = useBookInb();
  // Inter-branch SALE mode: the customer is a counterparty branch; the SO grid's
  // fares pass through to Inter-Branch Sales and the Service Charge becomes the
  // Service Fee (margin). Posts via the INB engine (not the booking pipeline).
  const createInb = useCreateInb();
  const [toBranch, setToBranch] = useState('');
  const inbBranches = INB_ALL.filter((b) => b !== brCode);
  const inbExport = interBranch && toBranch && inbCrossBorder(brCode, toBranch);

  // Switching module reloads the seed grid for that module — never while editing
  // (the module is locked to the existing voucher so its lines aren't wiped).
  // Reversal modules (RF/RI) have no fare-grid spec, so there's no seed grid to load —
  // skip the reset for them (the reversal UI is rendered via an early return and never
  // touches `lines`). Resetting here would call blankLine(undefined) → idCols crash.
  useEffect(() => { if (editing || !VSPECS[moduleCode]) return; setLines([blankLine(VSPECS[moduleCode])]); setNoSupplier(false); setResult(null); setError(''); setExtraPOs([]); }, [moduleCode]);

  // No-supplier is only offered on Miscellaneous (sell-without-buy: seats / extra
  // services). Any other module always has a supplier (cost) leg.
  const isNoSupp = moduleCode === 'SM' && noSupplier;
  // "Without VAT" is offered only on Africa/VAT branches; India ignores it.
  const isVatBr = isVatBranch(brCode);
  // Tax label drives every "GST" caption on the grid: Africa shows VAT, India GST.
  const taxLabel = isVatBr ? 'VAT' : 'GST';
  const effNoVat = isVatBr && noVat;
  const totals = useMemo(() => bookingTotals(spec, lines, { packageType, noSupplier: isNoSupp, branch: brCode, noVat: effNoVat, foreignSupplier: suppForeign, clientType }), [spec, lines, packageType, isNoSupp, brCode, effNoVat, suppForeign, clientType]);
  const hasPackage = moduleCode === 'SF' || moduleCode === 'SH';
  const getGstRate = () => {
    if (effNoVat) return 0;
    if (isVatBr) {
      return brCode === 'NBO' ? 16 : brCode === 'DAR' ? 18 : brCode === 'FBM' ? 16 : 18;
    }
    if (spec.model === 'package') return spec.gstRate ? spec.gstRate * 100 : 5;
    return spec.tax && spec.tax.rate != null ? spec.tax.rate : 18;
  };
  const activeRate = getGstRate();

  const setLine = (i, key, val, numeric) =>
    setLines(lines.map((l, idx) => (idx === i ? { ...l, [key]: numeric ? (val === '' ? '' : Number(val)) : val } : l)));
  const addLine = () => setLines([...lines, blankLine(spec)]);
  const delLine = (i) => setLines(lines.length > 1 ? lines.filter((_, idx) => idx !== i) : [blankLine(spec)]);

  // Has the user entered anything worth protecting? Used to confirm before a
  // destructive module switch and to warn on navigate-away (unsaved guard).
  const rowHasData = (l) => Object.keys(l || {}).some((k) => {
    if (k === 'id') return false;
    const v = l[k];
    if (v == null || v === '' || typeof v === 'object') return false;
    if (typeof v === 'number') return v !== 0;
    return String(v).trim() !== '';
  });
  const isDirty = () => !!(
    (customer.name || '').trim() || (supplier.name || '').trim() ||
    (remarks || '').trim() || lines.some(rowHasData)
  );

  // Switch the active module. For a NEW voucher the effect on `moduleCode` swaps the
  // seed grid. While EDITING the entered details are KEPT — each existing row is
  // re-shaped onto the new module's columns (shared fields like markup / service charge
  // / supplier service and any same-named fare/id columns carry over; the new module's
  // own fields default in). Customer, supplier, dates, tags & remarks are untouched.
  // The backend accepts the new module on Save and re-prefixes the spawned vouchers.
  const changeModule = async (code) => {
    if (code === moduleCode) return;
    // For a NEW voucher, switching type reseeds (and so WIPES) the grid — confirm
    // first if the user has entered anything, so an accidental chip click can't
    // silently discard a half-typed booking.
    if (!editing && isDirty()) {
      const { confirmed } = await confirmDialog({
        title: 'Switch voucher type?',
        message: 'This will clear the lines and details you have entered for this voucher.',
        confirmLabel: 'Switch & clear', danger: true,
      });
      if (!confirmed) return;
    }
    // Reversal modules (RF/RI) have no fare grid to reshape — just switch; the entry
    // form swaps to the reversal UI (early return below).
    if (isReversalModule(code) || isReversalModule(moduleCode)) { setModuleCode(code); setResult(null); setError(''); return; }
    if (!editing) { setModuleCode(code); return; }
    const m = VSPECS[code];
    setLines((prev) => prev.map((l) => normalizeLine(m, { ...blankLine(m), ...l })));
    setModuleCode(code);
    setResult(null); setError('');
  };

  // ── Sectors (Flight): per-sector travel detail, entered on the Purchase grid ──
  const setSec = (li, si, key, val) => setLines(lines.map((l, i) => (i === li ? { ...l, sectors: (l.sectors || []).map((s, j) => (j === si ? { ...s, [key]: val } : s)) } : l)));
  const addSec = (li) => setLines(lines.map((l, i) => (i === li ? { ...l, sectors: [...(l.sectors || []), blankSector()] } : l)));
  const delSec = (li, si) => setLines(lines.map((l, i) => (i === li ? { ...l, sectors: (l.sectors || []).length > 1 ? l.sectors.filter((_, j) => j !== si) : l.sectors } : l)));

  // Both posting ledgers are mandatory: the customer's Debtor ledger (receivable)
  // and the supplier's Creditor ledger (payable).
  const hasCustLedger = !!(customer.ledgerName || '').trim();
  const hasSuppLedger = !!supplier.name.trim();
  // No-supplier needs only a sale + a customer; otherwise a supplier + cost are required.
  const canSave = interBranch
    ? (!!brCode && !saving && !!toBranch && totals.so.total > 0)  // INB: just need a counterparty branch + a sale value
    : (!!brCode && !saving && totals.so.total > 0 && customer.name.trim() && hasCustLedger
      && (isNoSupp || (totals.po.total > 0 && hasSuppLedger)));

  // Saving ALWAYS lands the booking in Pending — there is no save-and-approve from
  // entry (for ANY user, Super Admin included). Approval happens only from the
  // Pending queue, so every voucher's books impact passes the same review gate.
  const save = async () => {
    // ── Inter-branch SALE: post via the INB engine, not the booking pipeline ──
    // Fares (the PO/SO fare columns) pass through to Inter-Branch Sales; the SO
    // Service Charge becomes the Service Fee (margin). IGST for India inter-state;
    // export zero-rated cross-border (decided server-side).
    if (interBranch) {
      if (!toBranch) { setError('Select the counterparty branch'); return; }
      const fareLines = (spec.fareCols || [])
        .map((c) => ({ ledger: 'Inter-Branch Sales', amt: round2(lines.reduce((s, l) => s + num(l[c.key]), 0)), desc: c.label }))
        .filter((l) => l.amt > 0);
      const serviceFee = round2(lines.reduce((s, l) => s + num(l.ssvc), 0));
      const pax = lines.map((l) => [l.fn, l.sn].filter(Boolean).join(' ')).filter(Boolean).join(', ');
      if (!fareLines.length && !serviceFee) { setError('Enter the fares and/or a Service Fee'); return; }
      // Supplier (airline) PURCHASE leg — booked through the INB voucher under the same
      // INB Link No. Sent only when a supplier + cost exist; otherwise the deal stays
      // sale-only (server skips the purchase). `totals.po` carries the PO grid's cost.
      const hasPurchase = !isNoSupp && supplier.name.trim() && totals.po.total > 0;
      setError(''); setSaving(true);
      createInb.mutate({
        fromBranch: brCode, toBranch, date, module: moduleCode,
        packageType: hasPackage ? packageType : '', passenger: pax, reference: saleTallyRef || headerRef,
        fareLines, serviceFee,
        noSupplier: isNoSupp,
        supplier: hasPurchase ? { name: supplier.name, ledgerName: supplier.ledgerName || supplier.name, ledgerGroup: supplier.ledgerGroup, country: countryOfSupplier(supplier.name), foreign: suppForeign } : null,
        purchase: hasPurchase ? { heads: totals.po.heads || [], gst: totals.po.gst || 0, incentiveAmt: totals.po.incentiveAmt || 0, incentiveTds: totals.po.incentiveTds || 0, gstMode: purGstMode } : null,
      }, {
        onSuccess: (res) => { setResult({ bookingNo: res?.inbLinkNo || '', _approved: false, _inb: true }); toast(`Inter-branch sale posted · ${res?.inbLinkNo || ''}`); qc.invalidateQueries({ queryKey: ['inb'] }); },
        onError: (e) => { setError(e.message || 'Failed to post'); toast(`Could not post — ${e.message || 'failed'}`, 'error'); },
        onSettled: () => setSaving(false),
      });
      return;
    }
    // Editing an existing booking requires a reason (saved to the audit trail).
    let editReason = '';
    if (editing) {
      const { confirmed, reason } = await confirmDialog({ title: 'Save changes to this voucher?', message: 'Editing reverses any posted entry and returns it to Pending for re-approval.', reasonRequired: true, reasonLabel: 'Reason for editing (saved to the audit trail)', confirmLabel: 'Save changes' });
      if (!confirmed) return; // cancelled — nothing saved
      editReason = reason;
    }
    setError(''); setSaving(true);
    try {
      const gpLines = lines.map((l) => {
        const c = lineCalc(spec, l, { branch: brCode, noVat: effNoVat });
        return { fn: l.fn, sn: l.sn, finalSales: c.finalSales, salesGST: c.salesGST, finalPurchase: c.finalPurchase, gstPur: c.gstPur, gp: c.gp, gpPct: c.gpPct };
      });
      const payload = {
        ...(editing ? { editReason } : {}),
        module: moduleCode, branch: brCode, date, travelDate, noSupplier: isNoSupp, noVat: effNoVat,
        customer: { name: customer.name, gstin: customer.gstin, address: customer.address, email: customer.email, contact: customer.contact, group: customer.group, ledgerName: customer.ledgerName || customer.name, ledgerGroup: customer.ledgerGroup || customer.group },
        supplier: isNoSupp ? { name: '', gstin: '', address: '', email: '', contact: '', ledgerGroup: '' }
          : { name: supplier.name, gstin: supplier.gstin, address: supplier.address, email: supplier.email, contact: supplier.contact, ledgerGroup: supplier.ledgerGroup, country: countryOfSupplier(supplier.name) },
        gstMode: saleGstMode, packageType: hasPackage ? packageType : '',
        headerRef, rows: lines.map((l) => syncLineRefs(spec, l)),
        po: { ...totals.po, gstMode: purGstMode }, so: { ...totals.so, gstMode: saleGstMode },
        gp: { lines: gpLines, total: totals.gp.total, pct: totals.gp.pct },
        remarks, saleTallyRef, purTallyRef,
        // N-PO: additional purchase legs (empty unless Flight+Misc / Holiday components).
        purchases: (isNoSupp ? [] : extraPOs).filter((leg) => num(leg.line.base) > 0 || num(leg.line.psvc) > 0).map((leg) => legToPayload(leg, brCode, effNoVat, isForeignSupplier(leg.supplier.name))),
      };
      const booking = editing
        ? await apiPut('/api/booking-orders/' + editBooking.id, payload)
        : await apiPost('/api/booking-orders', payload);
      setResult({ ...booking, _approved: false, _edited: editing });
      qc.invalidateQueries({ queryKey: ['booking-orders'] });
      if (editing) invalidateBooks(qc); // an edit reverses the prior posting → refresh every books cache
      toast(`Voucher ${booking.bookingNo || ''} saved — pending approval`);
      // If this PO was fetched from an open inter-branch leg, consume it (mark the
      // INB link booked). Non-fatal: a miss leaves the link open to retry.
      if (inbId && booking?.bookingNo) {
        try { await bookInb.mutateAsync({ id: inbId, purchaseVno: booking.bookingNo }); setInbLinkNo(''); setInbId(''); }
        catch (_) { /* link stays open; surfaced in the INB reconciliation */ }
      }
    } catch (e) { setError(e.message || 'Failed to save voucher'); toast(`Could not save — ${e.message || 'failed'}`, 'error'); }
    finally { setSaving(false); }
  };
  // Pull an open inter-branch leg into the PO: supplier = the selling branch, each
  // fare mapped to its matching fare column, Service Fee → Supplier Service, GST →
  // inter (IGST). Stamps inbLinkNo so the link is consumed on save.
  const fetchInb = (link) => {
    if (!link) return;
    setSupplier({ name: `Travkings Tours and Travels ${link.fromBranch}`, gstin: '', address: '', email: '', contact: '', ledgerGroup: '' });
    setPurGstMode('inter');
    if (link.packageType) setPackageType(link.packageType);
    const parts = String(link.passenger || '').trim().split(/\s+/);
    const ln = { ...blankLine(spec), fn: parts[0] || '', sn: parts.slice(1).join(' ') };
    for (const rl of (link.lines || [])) {
      const col = (spec.fareCols || []).find((c) => c.label.toLowerCase() === String(rl.desc || '').toLowerCase());
      if (col) ln[col.key] = num(rl.amt);
    }
    ln.psvc = num(link.serviceFee);
    setLines([ln]);
    setInbLinkNo(link.inbLinkNo);
    setInbId(link._id || link.id || '');
    toast(`Fetched ${link.inbLinkNo} from ${link.fromBranch} — review & save`);
  };

  // Tally-style keys across the whole entry screen: Enter advances between data
  // fields (skipping action buttons), Enter on the last field / Ctrl+Cmd+Enter saves.
  const formKeys = useFormKeys({ onSubmit: () => { if (canSave) save(); } });

  // Warn before leaving/refreshing with unsaved booking data (the form autosave
  // doesn't cover the multi-grid line state). Skipped once a save has succeeded.
  useEffect(() => {
    const onBeforeUnload = (e) => { if (!result && isDirty()) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, customer, supplier, lines, remarks]);

  // Reversal modules (Refund / Reissue) render a dedicated entry instead of the fare
  // grid — same module bar, but the original-invoice link + supplier-refund + retained
  // Service Charge - 2 inputs, spawning ONE RF/RI voucher on approval (reuses the proven
  // reversal posting). All hooks above have run, so this early return is safe.
  if (isReversalModule(moduleCode)) {
    return <ReversalEntry moduleCode={moduleCode} changeModule={changeModule} brCode={brCode} cur={cur} editing={editing} editBooking={editBooking} qc={qc} setRoute={setRoute} onDone={onDone} />;
  }

  const reset = () => { setLines([blankLine(spec)]); setCustomer({ name: '', gstin: '', address: '', email: '', contact: '', group: '', ledgerName: '', ledgerGroup: '' }); setSupplier({ name: '', gstin: '', address: '', email: '', contact: '', ledgerGroup: '' }); setNoSupplier(false); setResult(null); setError(''); setClientType(''); setExtraPOs([]); };

  if (result) {
    const approved = result._approved;
    const noSupp = !!result.noSupplier;
    const fields = [['Booking No', result.bookingNo], ['Link No', result.linkNo], ['Module', VSPECS[result.module]?.name || result.module], ['Status', (result.status || 'pending').toUpperCase()]];
    if (approved) { fields.push(['Sales invoice', result.saleVno || '—']); if (!noSupp) fields.push(['Purchase invoice', result.purchaseVno || '—']); }
    else { fields.push(['Sales (incl GST)', cur + ' ' + fmt(result.so?.total)], ['Gross Profit', cur + ' ' + fmt(result.gp?.total) + ` (${result.gp?.pct ?? 0}%)`]); }
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 12px' }}>
        <div style={{ ...card, textAlign: 'center', padding: 28 }}>
          <div style={{ width: 54, height: 54, borderRadius: '50%', background: approved ? '#e8f6ed' : '#FEF6E6', color: approved ? '#16a34a' : GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>{approved ? <Check size={28} /> : <Clock size={28} />}</div>
          <h2 style={{ margin: '0 0 4px', fontSize: 18, color: DARK }}>
            {approved ? 'Voucher approved & posted' : result._edited ? 'Voucher updated — still Pending' : 'Voucher saved — Pending approval'}
          </h2>
          <p style={{ margin: '0 0 18px', fontSize: 12.5, color: '#5b616e' }}>
            {approved
              ? (noSupp
                  ? <>The <b>Sales invoice</b> was generated and posted to the books — no purchase leg (the full sale value is income).</>
                  : <>The linked <b>Sales &amp; Purchase invoices</b> were generated and posted to the books, tied by the Link No.</>)
              : <>It has <b>no effect on the books yet</b>. Approve it under <b>Pending</b> to post {noSupp ? <>the <b>Sales invoice</b> (no purchase leg)</> : <>the linked Sales &amp; Purchase invoices</>}.</>}
          </p>
          <div className="grid grid-cols-1 gap-2.5 tablet:grid-cols-2" style={{ textAlign: 'left' }}>
            {fields.map(([k, v]) => (
              <div key={k} style={{ background: '#f7f8fb', borderRadius: 8, padding: '8px 12px' }}>
                <p style={{ margin: 0, fontSize: 9.5, color: '#9197a3', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k}</p>
                <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: DARK, fontFamily: 'monospace' }}>{v}</p>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 9, justifyContent: 'center', marginTop: 20 }}>
            {editing
              ? <button onClick={() => (onDone ? onDone() : setRoute && setRoute(approved ? '/bookings/approved' : '/bookings/pending'))} style={btnG}><ArrowRight size={14} /> Back to list</button>
              : <>
                  <button onClick={reset} className="max-tablet:min-h-[44px]" style={btnG}><Plus size={14} /> New voucher</button>
                  <button onClick={() => setRoute && setRoute(approved ? '/bookings/approved' : '/bookings/pending')} style={btnGh}>Go to {approved ? 'Approved' : 'Pending'} <ArrowRight size={14} /></button>
                </>}
          </div>
        </div>
      </div>
    );
  }

  const refKeys = spec.idCols.slice(2); // module reference fields (Ticket/PNR/etc.)
  const pkg = spec.model === 'package';  // Holiday tour-operator model (no service charge; 5% GST; entered supplier GST)
  // Bill-To is free text ONLY for B2C debtors (pooled per-staff ledgers); a named
  // B2B/B2E client IS the ledger, so its name doubles as the Bill-To.
  const isB2C = /b2c/i.test(customer.ledgerGroup || '');
  // Column counts for the full-width sectors sub-row (Flight only).
  const soCols = spec.idCols.length + spec.fareCols.length + 1 + (pkg ? 0 : 1) + (pkg ? 0 : 1) + 1 + 1 + 1;
  const poCols = 2 + refKeys.length + spec.fareCols.length + 5;

  // Sectors sub-table for a passenger line — editable on the Purchase grid,
  // read-only ("fetched & locked") on the Sales grid.
  const sectorBlock = (l, li, readOnly, colSpan) => {
    const grid = (
      <>
        <table style={{ borderCollapse: 'collapse' }}>
          <thead><tr>
            {spec.sectorCols.map((sc) => <th key={sc.key} style={{ ...thA, ...thL, fontSize: 8.5, padding: '4px 16px', ...(readOnly ? {} : { color: GOLD_DEEP, background: 'transparent', borderBottom: '1px solid #ecdfb8' }) }}>{sc.label}</th>)}
            {!readOnly && <th style={{ ...thA, width: 26, background: 'transparent', borderBottom: '1px solid #ecdfb8' }} />}
          </tr></thead>
          <tbody>
            {(l.sectors || []).map((s, si) => (
              <tr key={si}>
                {spec.sectorCols.map((sc) => (
                  <td key={sc.key} style={{ padding: '6px 16px' }}>
                    {readOnly
                      ? <span style={{ fontSize: 11, fontWeight: 600, color: s[sc.key] ? (sc.kind === 'pnr' ? GOLD : '#3A3A3A') : '#b9b9b9', fontStyle: s[sc.key] ? 'normal' : 'italic' }}>{s[sc.key] || `No ${sc.label}`}</span>
                      : <input type={sc.type === 'date' ? 'date' : 'text'} value={s[sc.key] ?? ''} onChange={(e) => setSec(li, si, sc.key, e.target.value)} placeholder={sc.label} style={{ ...cellTxt, width: sc.type === 'date' ? 140 : 110, color: sc.kind === 'pnr' ? GOLD : DARK }} />}
                  </td>
                ))}
                {!readOnly && <td style={{ padding: '6px 16px', textAlign: 'center' }}><button onClick={() => delSec(li, si)} title="Remove sector" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#b9b9b9' }}><Trash2 size={12} /></button></td>}
              </tr>
            ))}
          </tbody>
        </table>
        {!readOnly && (
          <button onClick={() => addSec(li)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, padding: '5px 12px', fontSize: 10.5, fontWeight: 700, color: GOLD_DEEP, background: '#FBF3DE', border: '1px solid #ecdfb8', borderRadius: 999, cursor: 'pointer' }}>
            <Plus size={11} /> Add sector
          </button>
        )}
      </>
    );
    return (
      <tr key={'sec-' + li}>
        <td colSpan={colSpan} style={{ padding: readOnly ? '8px 6px 8px 26px' : '10px 14px 12px 26px', background: readOnly ? '#faf7ef' : '#fbfcff', borderBottom: '1px solid #dfe2e7' }}>
          {readOnly ? (
            <div style={{ border: '1px solid #ece4cf', borderRadius: 10, background: '#fffdf7', padding: '10px 14px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 800, letterSpacing: '.4px', color: GOLD_DEEP, textTransform: 'uppercase', marginBottom: 8 }}>
                🔒 Sectors
                <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '.4px', textTransform: 'uppercase', background: '#FBF3DE', color: GOLD_DEEP, padding: '2px 7px', borderRadius: 999 }}>from Purchase · locked</span>
              </div>
              {grid}
            </div>
          ) : (
            <div style={{ border: '1px dashed #ecd5dc', borderRadius: 10, background: '#fffdfb', padding: '10px 14px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.4px', color: GOLD_DEEP, textTransform: 'uppercase', marginBottom: 8 }}>✈ Sectors — enter each segment</div>
              {grid}
            </div>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div ref={formKeys.ref} onKeyDown={formKeys.onKeyDown} style={{ maxWidth: 1600, margin: '0 auto', padding: '12px 10px 90px', fontFamily: HELV, color: '#1F2328', WebkitFontSmoothing: 'antialiased' }}>
      {/* Header */}
      <div style={{ ...card, border: '1px solid #dfe2e7', borderLeft: '4px solid ' + GOLD, borderRadius: 4, padding: 0, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ padding: '14px 18px', background: DARK, borderBottom: '3px solid ' + GOLD, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: '0.5px', color: '#fff' }}>{editing ? `EDIT — ${editBooking.bookingNo}` : (interBranch ? 'INTER-BRANCH (INB) VOUCHER' : 'SO / PO / GP VOUCHER')}</p>
            <p style={{ margin: '2px 0 0', fontSize: 10.5, color: '#8A8A84' }}>
              {editing
                ? <>Fix any data-entry mistake — or switch the <b style={{ color: GOLD }}>module</b> if it was booked wrong — then <b style={{ color: GOLD }}>Save changes</b> · {brCode} · returns to Pending; approve it from the Pending queue</>
                : interBranch
                  ? <>Sell to another branch (Inter-Branch Sale) + book the supplier purchase — both under one <b style={{ color: GOLD }}>INB Link No</b> · {brCode || 'select a branch'} · saves as <b style={{ color: GOLD }}>Pending</b></>
                  : <>Enter cost + Service Charge - 2 → Sales auto-derives. Saving creates a <b style={{ color: GOLD }}>Pending</b> voucher · {brCode || 'select a branch'}</>}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[...VMODULE_LIST, ...REVERSAL_CHIPS].map((m) => (
              <button key={m.code} onClick={() => changeModule(m.code)}
                title={editing && m.code !== moduleCode ? `Switch this voucher to ${m.name} — the entered details are kept` : ''}
                className="inline-flex items-center max-tablet:min-h-[44px]"
                style={{ padding: '5px 11px', borderRadius: 999, border: '1px solid ' + (moduleCode === m.code ? GOLD : '#2e323c'), background: moduleCode === m.code ? GOLD : 'transparent', color: moduleCode === m.code ? '#fff' : '#9197a3', fontSize: 10.5, fontWeight: 700, cursor: m.code === moduleCode ? 'default' : 'pointer' }}>
                {m.icon} {m.name}
              </button>
            ))}
          </div>
        </div>
        {/* Link band */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', background: '#1f1f1f' }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.2px', color: GOLD, textTransform: 'uppercase' }}>{interBranch ? 'INB Link No' : 'Link No'}</span>
          <span style={{ padding: '5px 12px', borderRadius: 4, background: GOLD_SOFT, color: GOLD_DEEP, fontWeight: 800, letterSpacing: '.5px', fontFamily: 'monospace', fontSize: 13 }}>{editing ? (editBooking.linkNo || '—') : (interBranch ? 'INB Link · on save' : `${nextLinkNo} · on save`)}</span>
          <span style={{ fontSize: 10.5, color: '#9197a3', fontStyle: 'italic' }}>{interBranch ? 'links the Inter-Branch Sale & Supplier Purchase of this voucher' : 'links the Sales Order, Purchase Order & Gross Profit of this invoice'}</span>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {(interBranch ? ['INB', 'SO', 'PO', 'GP'] : ['SO', 'PO', 'GP']).map((c) => <span key={c} style={{ fontSize: 9, fontWeight: 800, padding: '3px 9px', borderRadius: 20, background: c === 'INB' ? GOLD : GOLD_SOFT, color: c === 'INB' ? '#fff' : GOLD_DEEP }}>{c}</span>)}
          </span>
        </div>
      </div>

      {/* Misc: with / without supplier. "Without" = we sell but don't buy (extra
          seats / services) → no purchase leg, the full sale value is income. */}
      {moduleCode === 'SM' && (
        <div style={{ ...card, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: DARK, textTransform: 'uppercase', letterSpacing: '.3px' }}>Supplier</span>
          <div style={{ display: 'inline-flex', border: '1px solid #cdd1d8', borderRadius: 7, overflow: 'hidden' }}>
            {[['with', 'With supplier (cost + margin)'], ['without', 'Without supplier (pure income)']].map(([v, l]) => {
              const active = (v === 'without') === noSupplier;
              return (
                <button key={v} type="button" onClick={() => setNoSupplier(v === 'without')}
                  className="max-tablet:min-h-[44px]"
                  style={{ padding: '6px 14px', fontSize: 11.5, fontWeight: 600, border: 'none', cursor: 'pointer', background: active ? GOLD : '#fff', color: active ? '#fff' : '#5b616e' }}>{l}</button>
              );
            })}
          </div>
          <span style={{ fontSize: 10.5, color: '#9A9A9A', fontStyle: 'italic' }}>
            {noSupplier
              ? 'No purchase leg — the full sale value is income (Sales — Other Services). Gross Profit = 100%.'
              : 'A linked Purchase invoice posts the supplier cost; Gross Profit = sale − cost.'}
          </span>
        </div>
      )}

      {/* Africa/VAT branches: VAT applies at the branch rate by default, OR tick
          "Without VAT" to zero-rate this booking (e.g. international air). India
          branches always follow the per-module GST rule, so this is hidden there. */}
      {isVatBr && (
        <div style={{ ...card, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: DARK, textTransform: 'uppercase', letterSpacing: '.3px' }}>VAT</span>
          <div style={{ display: 'inline-flex', border: '1px solid #cdd1d8', borderRadius: 7, overflow: 'hidden' }}>
            {[['with', 'With VAT'], ['without', 'Without VAT']].map(([v, l]) => {
              const active = (v === 'without') === noVat;
              return (
                <button key={v} type="button" onClick={() => setNoVat(v === 'without')}
                  className="max-tablet:min-h-[44px]"
                  style={{ padding: '6px 14px', fontSize: 11.5, fontWeight: 600, border: 'none', cursor: 'pointer', background: active ? GOLD : '#fff', color: active ? '#fff' : '#5b616e' }}>{l}</button>
              );
            })}
          </div>
          <span style={{ fontSize: 10.5, color: '#9A9A9A', fontStyle: 'italic' }}>
            {noVat
              ? 'No VAT calculated on this booking (zero-rated).'
              : `VAT charged at the branch rate on the Service Fee / margin.`}
          </span>
        </div>
      )}

      {!brCode && (
        <div style={{ ...card, background: '#fbe9e9', border: '1px solid #f3c9c9', color: '#dc2626', fontSize: 12, marginBottom: 14 }}>
          Select a specific branch (not “All branches”) from the top bar to create a voucher.
        </div>
      )}

      {editing && !(Array.isArray(editBooking.rows) && editBooking.rows.length) && (
        rowsFromSnapshots(editBooking).length ? (
          <div style={{ ...card, background: '#EAF1FB', border: '1px solid #B9D6F2', color: '#2563eb', fontSize: 12, marginBottom: 14 }}>
            ⓘ This voucher was bulk-imported without the full per-line grid. The line(s) below were <b>rebuilt from the saved Sale / Purchase figures</b> — please verify them; <b>saving recomputes the totals &amp; GST</b> from what's shown here.
          </div>
        ) : (
          <div style={{ ...card, background: '#FFF7E6', border: '1px solid #F0C36D', color: '#7a5b12', fontSize: 12, marginBottom: 14 }}>
            ⓘ This voucher was bulk-imported without per-line detail. Re-enter the line(s) below — <b>saving recomputes the totals</b> from what you enter here.
          </div>
        )
      )}

      {interBranch && (
        <div style={{ ...card, background: '#EAF1FB', border: '1px solid #B9D6F2', color: '#185FA5', fontSize: 12, marginBottom: 14 }}>
          🔁 <b>Inter-Branch sale.</b> Enter the fares in the Purchase Order grid (pass-through at cost) and your margin in the Sales <b>Service Fee</b> column. Fares post to <b>Inter-Branch Sales</b>, the Service Fee to <b>Service Fee Income</b>.
          {toBranch && <> Tax: <b>{inbExport ? `Export · zero-rated (${INB_COUNTRY[brCode]}→${INB_COUNTRY[toBranch]})` : 'IGST · inter-state (18% on Service Fee)'}</b>.</>}
          {' '}Creates an INB Link No the {toBranch || 'buying'} branch fetches on its SO/PO/GP.
        </div>
      )}

      {/* Header fields */}
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 11 }}>
          <FL label="SPG Date"><SmartDateInput max={todayISO()} value={date} onChange={setDate} style={inp} /></FL>
          <FL label="Travel / Departure Date"><SmartDateInput value={travelDate} onChange={setTravelDate} min={editing ? undefined : todayISO()} style={inp} title="When the customer travels (no past dates) — type e.g. 20.03.2026 → 20/03/2026; drives the Upcoming Travel dashboard" /></FL>
          <FL label="Client Type">
            <select value={clientType} onChange={(e) => handleClientTypeChange(e.target.value)} style={inp}>
              <option value="">All Client Types</option>
              {clientTypes.map((ct) => (
                <option key={ct} value={ct}>{ct}</option>
              ))}
            </select>
          </FL>
          {spec.headerLabel && spec.headerLabel !== 'Sector / Airline' && (
            <FL label={spec.headerLabel}><input value={headerRef} onChange={(e) => setHeaderRef(e.target.value)} placeholder={spec.headerLabel} style={inp} /></FL>
          )}
          {interBranch ? (
            <FL label={<>To Branch (counterparty) <span style={{ color: '#dc2626' }}>*</span></>}>
              <select value={toBranch} onChange={(e) => {
                const tb = e.target.value;
                setToBranch(tb);
                if (tb) { setCustomer((c) => ({ ...c, name: `Travkings Tours and Travels ${tb}`, ledgerName: `Travkings Tours and Travels ${tb}`, ledgerGroup: 'Sundry Debtors', group: 'Sundry Debtors' })); setSaleGstMode(inbCrossBorder(brCode, tb) ? 'inter' : 'inter'); }
              }} style={inp}>
                <option value="">Select branch</option>
                {inbBranches.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </FL>
          ) : (
          <FL label="Client Ledger *">
            <PartyPicker branch={branch} kind="customer" value={{ name: customer.ledgerName, group: customer.ledgerGroup }} subGroupFilter={clientType}
              onChange={(v) => {
                setCustomer((c) => {
                  const b2c = /b2c/i.test(v.group || '');
                  // B2B/B2E: the ledger IS the customer → Bill-To = ledger name.
                  // B2C (pooled per-staff ledger): keep the free-typed end-customer name.
                  return { ...c, ledgerName: v.name, ledgerGroup: v.group, group: v.group, name: b2c ? c.name : v.name };
                });
                if (v.group) setClientType(v.group);
              }} />
          </FL>
          )}
          {isB2C && (
            <FL label="Customer (Bill to) — free text *">
              <input value={customer.name} onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))} placeholder="End-customer name (B2C)" style={inp} />
              {!customer.name.trim()}
            </FL>
          )}
          {/* VAT has no intra/inter (place-of-supply) split — these CGST/SGST vs IGST
              selectors are India-only and are hidden on Africa/VAT branches. */}
          {!isVatBr && <FL label="Sale GST mode"><select value={saleGstMode} onChange={(e) => setSaleGstMode(e.target.value)} style={inp}><option value="intra">Intra-state (CGST+SGST)</option><option value="inter">Inter-state (IGST)</option></select></FL>}
          {!isNoSupp && <FL label={interBranch ? 'Supplier ledger (airline / cost) *' : 'Supplier ledger (Pay to) *'}>
            <PartyPicker branch={branch} kind="supplier" value={{ name: supplier.name, group: supplier.ledgerGroup }}
              onChange={(v) => setSupplier({ ...supplier, name: v.name, ledgerGroup: v.group })} />
          </FL>}
          {!isNoSupp && !isVatBr && <FL label="Purchase GST mode"><select value={purGstMode} onChange={(e) => setPurGstMode(e.target.value)} style={inp}><option value="intra">Intra-state (CGST+SGST)</option><option value="inter">Inter-state (IGST)</option></select></FL>}
          {hasPackage && <FL label="Package type *"><select value={packageType} onChange={(e) => setPackageType(e.target.value)} style={{ ...inp, paddingRight: 26 }}><option value="">Select International / Domestic</option><option value="Domestic">Domestic</option><option value="International">International</option></select>
          </FL>}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 18, alignItems: 'center', padding: '8px 14px', marginBottom: 12, background: '#FDFAF4', border: '1px solid #eee3cf', borderRadius: 8, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 10.5, fontWeight: 700, color: '#3A3A3A' }}><span style={{ width: 24, height: 15, borderRadius: 3, background: '#fff', border: '1px solid #C49A3C' }} /> Manual — you enter</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 10.5, fontWeight: 700, color: '#3A3A3A' }}><span style={{ width: 24, height: 15, borderRadius: 3, background: '#faf7ef', border: '1px dashed #9A9A9A' }} /> Auto — calculated</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#9A9A9A', fontStyle: 'italic' }}>shaded fields are computed and can't be typed into · {pkg ? `Holiday package: ${activeRate}% ${taxLabel} on (Base Fare + Service Charge - 2); supplier service charge is a purchase-side cost (not billed to client), supplier ${taxLabel} claimed as Input (ITC)${isVatBr ? '' : '; Intl adds 2% TCS'}` : `Service Charge - 2 is ${taxLabel}-inclusive (${taxLabel} = Service Charge - 2 × ${activeRate} ÷ ${100 + activeRate}), posted to separate ${taxLabel} ledgers`}</span>
      </div>

      {/* ① Sales Order */}
      <Section n="1" badge="SO" name="Sales Order" sub={pkg ? 'what the customer pays · 5% GST on the package + 2% TCS (Intl)' : 'what the customer pays · Service Charge - 2 is GST-inclusive'} accent={SO_BAR}>
        <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #d8e0ea' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
            <thead><tr style={{ borderBottom: '2px solid ' + SO_BAR }}>
              {spec.idCols.map((c) => <th key={c.key} style={{ ...soHdrL, width: c.key === 'fn' || c.key === 'sn' ? 140 : 120 }}>{c.label}</th>)}
              {spec.fareCols.map((c) => <th key={c.key} style={{ ...soHdr, width: 95, whiteSpace: 'normal' }}>{c.label}</th>)}
              {!interBranch && <th style={{ ...soHdr, width: 95, whiteSpace: 'normal' }}>Service Charge - 2</th>}{!pkg && <th style={{ ...soHdr, width: 95, whiteSpace: 'normal' }}>Service Fee</th>}
              {!pkg && <th style={{ ...soHdr, width: 95, whiteSpace: 'normal' }}>{taxLabel}/Service Fee ({activeRate}%)</th>}{!interBranch && <th style={{ ...soHdr, width: 95, whiteSpace: 'normal' }}>{pkg ? `${taxLabel} (5%)` : `${taxLabel}/Service Charge - 2 (${activeRate}%)`}</th>}{spec.tcs && <th style={{ ...soHdr, width: 95, whiteSpace: 'normal' }}>TCS ({spec.tcs.rate}%)</th>}<th style={{ ...soHdr, width: 110, whiteSpace: 'normal' }}>Total</th><th style={{ ...soHdr, width: 45 }}></th>
            </tr></thead>
            <tbody>
              {lines.map((l, i) => {
                const c = lineCalc(spec, l, { branch: brCode, noVat: effNoVat, foreignSupplier: suppForeign });
                // TCS (Intl packages, u/s 206C(1G)) is a booking-level charge on the sale incl GST;
                // show each line's share only when it actually applies (totals.so.tcs > 0).
                const lineTcs = (spec.tcs && totals.so.tcs > 0) ? c.finalSales * spec.tcs.rate / 100 : 0;
                return (
                  <React.Fragment key={i}>
                  <tr>
                    {spec.idCols.map((col) => (
                      <td key={col.key} style={{ ...tdC, textAlign: 'left', padding: 3, width: col.key === 'fn' || col.key === 'sn' ? 140 : 120, ...(spec.sectors ? { background: '#faf7ef' } : {}) }}>
                        {spec.sectors
                          ? <span style={{ fontSize: 11.5, fontWeight: 600, color: l[col.key] ? DARK : '#b9b9b9', fontStyle: l[col.key] ? 'normal' : 'italic' }}>{l[col.key] || `No ${col.label}`}</span>
                          : <input value={l[col.key] ?? ''} onChange={(e) => setLine(i, col.key, e.target.value)} style={{ ...cellTxt, color: col.kind === 'pnr' ? GOLD : DARK }} />}
                      </td>
                    ))}
                    {spec.fareCols.map((col) => (isNoSupp
                      ? <td key={col.key} style={{ padding: 3, width: 95 }}><input type="number" min="0" value={l[col.key] ?? ''} placeholder="0" onChange={(e) => setLine(i, col.key, e.target.value, true)} style={cellInp} /></td>
                      : <td key={col.key} style={{ ...tdAuto, width: 95 }}>{fmt(l[col.key])}</td>))}
                    {!interBranch && <td style={{ padding: 3, width: 95, background: '#faf7ef' }}><input type="number" min="0" value={l.markup ?? ''} placeholder="0" onChange={(e) => setLine(i, 'markup', e.target.value, true)} style={cellInp} /></td>}
                    {!pkg && <td style={{ padding: 3, width: 95, background: '#faf7ef' }}><input type="number" min="0" value={l.ssvc ?? ''} placeholder="0" onChange={(e) => setLine(i, 'ssvc', e.target.value, true)} style={cellInp} /></td>}
                    {!pkg && <td style={{ ...tdAuto, width: 95 }}>{fmt(c.gstSvc)}</td>}
                    {!interBranch && <td style={{ ...tdAuto, width: 95 }}>{fmt(pkg ? c.salesGST : c.gstMk)}</td>}
                    {spec.tcs && <td style={{ ...tdAuto, width: 95 }}>{fmt(lineTcs)}</td>}
                    <td style={{ ...tdC, fontWeight: 800, color: DR, background: '#faf7ef', width: 110 }}>{fmt(c.finalSales + lineTcs)}</td>
                    <td style={{ ...tdC, textAlign: 'center', background: '#faf7ef', padding: 3, width: 45 }}><button onClick={() => delLine(i)} title="Remove" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#b9b9b9' }}><Trash2 size={13} /></button></td>
                  </tr>
                  {spec.sectors && sectorBlock(l, i, true, soCols)}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot><tr>
              <td style={{ ...soTf, textAlign: 'left' }}>TOTAL</td>
              {spec.idCols.slice(1).map((c) => <td key={c.key} style={soTf} />)}
              {spec.fareCols.map((c) => <td key={c.key} style={soTf}>{fmt(lines.reduce((s, l) => s + num(l[c.key]), 0))}</td>)}
              {!interBranch && <td style={soTf}>{fmt(lines.reduce((s, l) => s + num(l.markup), 0))}</td>}
              {!pkg && <td style={soTf}>{fmt(lines.reduce((s, l) => s + num(l.ssvc), 0))}</td>}
              {!pkg && <td style={soTf}>{fmt(totals.so.gst)}</td>}{!interBranch && <td style={soTf}>{fmt(pkg ? totals.so.gst + totals.so.otherTaxesGst : totals.so.otherTaxesGst)}</td>}
              {spec.tcs && <td style={soTf}>{fmt(totals.so.tcs)}</td>}
              <td style={{ ...soTf, color: DR }}>{fmt(totals.so.total)}</td><td style={soTf} />
            </tr></tfoot>
          </table>
        </div>
        <button onClick={addLine} style={{ ...btnGh, marginTop: 8, padding: '6px 12px', fontSize: 11 }}><Plus size={12} /> Add line</button>
      </Section>

      {/* ② Purchase Order — hidden in no-supplier mode (there's no cost leg). */}
      {!isNoSupp && (
      <Section n="2" badge="PO" name="Purchase Order" sub={`what you pay the airline / supplier · supplier incentive is automatically subtracted${suppForeign ? ' · foreign supplier — no Indian TDS' : ', 2% TDS is added'}`} accent={PO_BAR}>
        {!editing && (openInbQ.data || []).length > 0 && (
          <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: CR }}>Fetch open INB:</span>
            <select value="" onChange={(e) => { const l = (openInbQ.data || []).find((x) => x.inbLinkNo === e.target.value); if (l) fetchInb(l); }}
              style={{ padding: '5px 8px', border: '1px solid #cdd1d8', borderRadius: 6, fontSize: 12, minWidth: 340 }}>
              <option value="">Inter-branch legs sent to {brCode}…</option>
              {(openInbQ.data || []).map((l) => <option key={l.inbLinkNo} value={l.inbLinkNo}>{l.inbLinkNo} · from {l.fromBranch} · {l.passenger || '—'} · {fmt(l.total)}</option>)}
            </select>
            {inbLinkNo && <span style={{ fontSize: 11, fontWeight: 700, color: '#27500A' }}>✓ {inbLinkNo} — fares & Service Fee pre-filled (IGST)</span>}
          </div>
        )}
        <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #ecd5dc' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 960, tableLayout: 'fixed' }}>
            <thead><tr style={{ borderBottom: '2px solid ' + PO_BAR }}>
              <th style={{ ...poHdrL, width: 140 }}>{spec.idCols[0].label}</th>
              <th style={{ ...poHdrL, width: 140 }}>{spec.idCols[1].label}</th>
              {refKeys.map((c) => <th key={c.key} style={{ ...poHdrL, width: 120 }}>{c.label}</th>)}
              {spec.fareCols.map((c) => <th key={c.key} style={{ ...poHdr, width: 95, whiteSpace: 'normal' }}>{c.label}</th>)}
              <th style={{ ...poHdr, width: 95, whiteSpace: 'normal' }}>Supplier Service Charge</th>
              {pkg
                ? <th style={{ ...poHdr, width: 95, whiteSpace: 'normal' }}>Supplier Service Charge {taxLabel} ({activeRate}%)</th>
                : <th style={{ ...poHdr, width: 95, whiteSpace: 'normal', background: '#FBF3DE', color: GOLD_DEEP }}>{taxLabel} ({activeRate}%)</th>}
              <th style={{ ...poHdr, width: 100, whiteSpace: 'normal' }}>Supp Comm/Inc Rcvd</th>
              <th style={{ ...poHdr, width: 85 }}>{isVatBr ? 'WHT' : 'TDS (2%)'}</th>
              <th style={{ ...poHdr, width: 110 }}>Total</th>
            </tr></thead>
            <tbody>
              {lines.map((l, i) => {
                const c = lineCalc(spec, l, { branch: brCode, noVat: effNoVat, foreignSupplier: suppForeign });
                return (
                  <React.Fragment key={i}>
                  <tr className="transition hover:bg-[#fdf7f9]">
                    <td style={{ ...tdC, textAlign: 'left', padding: '6px 3px', width: 140, ...(spec.sectors ? { borderBottom: 'none' } : {}) }}><input value={l.fn ?? ''} onChange={(e) => setLine(i, 'fn', e.target.value)} placeholder={spec.idCols[0].label} style={cellTxt} /></td>
                    <td style={{ ...tdC, textAlign: 'left', padding: '6px 3px', width: 140, ...(spec.sectors ? { borderBottom: 'none' } : {}) }}><input value={l.sn ?? ''} onChange={(e) => setLine(i, 'sn', e.target.value)} placeholder={spec.idCols[1].label} style={cellTxt} /></td>
                    {refKeys.map((col) => <td key={col.key} style={{ ...tdAuto, textAlign: 'left', fontWeight: 700, color: col.kind === 'pnr' ? GOLD : '#3A3A3A', width: 120, ...(spec.sectors ? { borderBottom: 'none' } : {}) }}>{l[col.key] || '—'}</td>)}
                    {spec.fareCols.map((col) => <td key={col.key} style={{ padding: '6px 3px', width: 60, ...(spec.sectors ? { borderBottom: 'none' } : {}) }}><input type="number" min="0" value={l[col.key] ?? ''} placeholder="0" onChange={(e) => setLine(i, col.key, e.target.value, true)} style={cellInp} /></td>)}
                    <td style={{ padding: '6px 3px', width: 95, ...(spec.sectors ? { borderBottom: 'none' } : {}) }}><input type="number" min="0" value={l.psvc ?? ''} placeholder="0" onChange={(e) => setLine(i, 'psvc', e.target.value, true)} style={cellInp} /></td>
                    {pkg
                      ? <td style={{ padding: '6px 3px', width: 95, ...(spec.sectors ? { borderBottom: 'none' } : {}) }}><input type="number" min="0" value={l.psvcGst ?? ''} placeholder="0" onChange={(e) => setLine(i, 'psvcGst', e.target.value, true)} style={cellInp} /></td>
                      : <td style={{ ...tdAuto, width: 95, background: '#FBF3DE', color: GOLD_DEEP, ...(spec.sectors ? { borderBottom: 'none' } : {}) }}>{fmt(c.gstPur)}</td>}
                    <td style={{ padding: '6px 3px', width: 100, ...(spec.sectors ? { borderBottom: 'none' } : {}) }}><input type="number" min="0" value={l.incentive ?? ''} placeholder="0" onChange={(e) => setLine(i, 'incentive', e.target.value, true)} style={cellInp} /></td>
                    <td style={{ ...tdAuto, width: 85, ...(spec.sectors ? { borderBottom: 'none' } : {}) }}>{fmt(c.tds)}</td>
                    <td style={{ ...tdC, fontWeight: 800, color: CR, background: '#faf7ef', width: 110, ...(spec.sectors ? { borderBottom: 'none' } : {}) }}>{fmt(c.finalPurchase)}</td>
                  </tr>
                  {spec.sectors && sectorBlock(l, i, false, poCols)}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot><tr>
              <td style={{ ...poTf, textAlign: 'left' }}>TOTAL</td>
              <td style={poTf} />
              {refKeys.map((c) => <td key={c.key} style={poTf} />)}
              {spec.fareCols.map((c) => <td key={c.key} style={poTf}>{fmt(lines.reduce((s, l) => s + num(l[c.key]), 0))}</td>)}
              <td style={poTf}>{fmt(lines.reduce((s, l) => s + num(l.psvc), 0))}</td>
              <td style={poTf}>{pkg ? fmt(lines.reduce((s, l) => s + num(l.psvcGst), 0)) : fmt(totals.po.gst)}</td>
              <td style={poTf}>{fmt(totals.po.incentiveAmt)}</td>
              <td style={poTf}>{fmt(totals.po.incentiveTds)}</td>
              <td style={{ ...poTf, color: CR }}>{fmt(totals.po.total)}</td>
            </tr></tfoot>
          </table>
        </div>
      </Section>
      )}

      {/* N-PO: additional purchase legs (Flight +Misc / Holiday components) */}
      {!isNoSupp && ALLOWED_LEG_MODULES[moduleCode] && (
        <ExtraPurchases parentModule={moduleCode} branch={branch} brCode={brCode} noVat={effNoVat} legs={extraPOs} onChange={setExtraPOs} isForeign={isForeignSupplier} />
      )}

      {/* ③ Gross Profit */}
      <Section n="3" badge="GP" name="Gross Profit" sub="GP = net sales − net purchase · % on final sales value" accent={GP_BAR}>
        <div className="mb-3 grid grid-cols-1 gap-3 tablet:grid-cols-3">
          <GpCard k={'Total Sales (incl ' + taxLabel + (totals.so.tcs > 0 ? ' & TCS' : '') + ')'} v={cur + ' ' + fmt(totals.so.total)} color={DARK} bg="#FFFDF7" />
          <GpCard k={'Total Purchase (incl ' + taxLabel + ')'} v={cur + ' ' + fmt(totals.po.total)} color={CR} bg="#FFFAEC" />
          <GpCard k="Gross Profit" v={cur + ' ' + fmt(totals.gp.total)} color={DR} pct={totals.gp.pct + '% margin'} bg="#FCF3DE" />
        </div>
        {totals.so.tcs > 0 && (
          <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 7, background: '#FFF7E6', border: '1px solid #F0C36D', color: '#7a5b12', fontSize: 11.5 }}>
            Incl. <b>TCS @ {spec.tcs.rate}% = {cur} {fmt(totals.so.tcs)}</b> collected from the customer on this International package (u/s 206C(1G)) — posts to <b>TCS Payable</b> (Balance Sheet), not income, so GP is unaffected.
          </div>
        )}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead><tr style={{ background: '#f8fafc', borderBottom: '2px solid #cdd1d8' }}>
              <th style={{ ...thA, ...thL, width: 140 }}>First Name</th><th style={{ ...thA, ...thL, width: 140 }}>Surname</th>
              <th style={{ ...thA, width: 110 }}>Final Sales</th><th style={{ ...thA, width: 85 }}>SVF {taxLabel} ({activeRate}%)</th><th style={{ ...thA, width: 85 }}>SVC2 {taxLabel} ({activeRate}%)</th><th style={{ ...thA, width: 110 }}>Final Purchase</th><th style={{ ...thA, width: 95 }}>Purchase {taxLabel} ({activeRate}%)</th>
              <th style={{ ...thA, width: 95 }}>Supp Comm/Inc Rcvd</th><th style={{ ...thA, width: 80 }}>{isVatBr ? 'WHT' : 'TDS (2%)'}</th>
              <th style={{ ...thA, width: 110 }}>Gross Profit</th><th style={{ ...thA, width: 80 }}>GP %</th>
            </tr></thead>
            <tbody>
              {lines.map((l, i) => {
                const c = lineCalc(spec, l, { branch: brCode, noVat: effNoVat, foreignSupplier: suppForeign });
                return (
                  <tr key={i}>
                    <td style={{ ...tdAuto, textAlign: 'left', width: 140 }}>{l.fn || '—'}</td><td style={{ ...tdAuto, textAlign: 'left', width: 140 }}>{l.sn || ''}</td>
                    <td style={{ ...tdAuto, width: 110 }}>{fmt(c.finalSales)}</td><td style={{ ...tdAuto, width: 85 }}>{fmt(c.gstSvc)}</td><td style={{ ...tdAuto, width: 85 }}>{fmt(c.gstMk)}</td>
                    <td style={{ ...tdAuto, width: 110 }}>{fmt(c.finalPurchase)}</td><td style={{ ...tdAuto, width: 95 }}>{fmt(c.gstPur)}</td>
                    <td style={{ ...tdAuto, width: 95 }}>{fmt(c.incentive)}</td><td style={{ ...tdAuto, width: 80 }}>{fmt(c.tds)}</td>
                    <td style={{ ...tdAuto, fontWeight: 800, color: DR, width: 110 }}>{fmt(c.gp)}</td>
                    <td style={{ ...tdAuto, fontWeight: 800, color: GOLD, width: 80 }}>{c.gpPct.toFixed(2)}%</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr>
              <td style={{ ...tfTd, textAlign: 'left' }} colSpan={2}>TOTAL</td>
              <td style={tfTd}>{fmt(totals.so.total)}</td><td style={tfTd}>{fmt(totals.so.gst)}</td><td style={tfTd}>{fmt(totals.so.otherTaxesGst)}</td>
              <td style={tfTd}>{fmt(totals.po.total)}</td><td style={tfTd}>{fmt(totals.po.gst)}</td>
              <td style={tfTd}>{fmt(totals.po.incentiveAmt)}</td><td style={tfTd}>{fmt(totals.po.incentiveTds)}</td>
              <td style={{ ...tfTd, color: DR }}>{fmt(totals.gp.total)}</td><td style={{ ...tfTd, color: GOLD }}>{totals.gp.pct.toFixed(2)}%</td>
            </tr></tfoot>
          </table>
        </div>
      </Section>

      {error && <div style={{ ...card, background: '#fbe9e9', border: '1px solid #f3c9c9', color: '#dc2626', fontSize: 12, marginBottom: 14 }}>{error}</div>}

      {/* Footer */}
      <div style={{ position: 'sticky', bottom: 0, background: '#FAFAF8', borderTop: '1px solid #dfe2e7', padding: '12px 0', display: 'flex', gap: 9, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: '#5b616e', marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
          {editing ? <><Pencil size={12} /> Editing returns this voucher to Pending — approve it from the Pending queue to post the books.</> : <><Clock size={12} /> Saving creates a Pending voucher — it posts to the books only after approval.</>}
        </span>
        <FL label="Remarks"><input value={remarks} onChange={(e) => setRemarks(e.target.value)} style={{ ...inp, width: 220 }} placeholder="optional" /></FL>
        <FL label="Sales Tally Ref"><input value={saleTallyRef} onChange={(e) => setSaleTallyRef(e.target.value)} style={{ ...inp, width: 130 }} placeholder="optional" /></FL>
        {!isNoSupp && <FL label="Purchase Tally Ref"><input value={purTallyRef} onChange={(e) => setPurTallyRef(e.target.value)} style={{ ...inp, width: 130 }} placeholder="optional" /></FL>}
        {editing && (
          <button onClick={() => (onDone ? onDone() : setRoute && setRoute('/bookings/pending'))} className="max-tablet:min-h-[44px]" style={btnGh}><XCircle size={14} /> Cancel</button>
        )}
        <button disabled={!canSave} onClick={() => save()} className="max-tablet:min-h-[44px]"
          style={{ ...btnG, background: canSave ? (editing ? DARK : GOLD) : '#9ca3af', cursor: canSave ? 'pointer' : 'not-allowed', opacity: canSave ? 1 : 0.7 }}>
          {saving ? <RefreshCw size={14} className="spin" /> : <Save size={14} />} {saving ? 'Saving…' : (editing ? 'Save changes (Pending)' : 'Save voucher (Pending)')}
        </button>
      </div>
    </div>
  );
}

// ─── Refund / Reissue entry (reversal modules) ────────────────────────────────
// Picked from the SO/PO/GP module bar; references the original sale invoice and, on
// approval, spawns ONE RF/RI voucher posted via the proven reversal engine. Reuses
// the RefundReissueFields body; maps its margin input → the booking's Service Charge - 2.
function ReversalEntry({ moduleCode, changeModule, brCode, cur, editing, editBooking, qc, setRoute, onDone }) {
  const kind = moduleCode === 'RF' ? 'refund' : 'reissue';
  const [state, setState] = useState(() => {
    const r = (editing && editBooking && editBooking.reversal) || {};
    return {
      date: (editing && editBooking.date) || today(),
      againstInvoice: (editing && (editBooking.againstInvoice || r.againstInvoice)) || '',
      againstPurchase: (editing && (editBooking.againstPurchase || r.againstPurchase)) || '',
      gstMode: r.gstMode || (editing && editBooking.gstMode) || 'intra',
      party: (editing && (editBooking.customer?.ledgerName || editBooking.customer?.name)) || '',
      counterParty: r.counterParty || (editing && editBooking.supplier?.ledgerName) || '',
      supplierAmt: r.supplierAmt ?? '', serviceCharge: r.serviceCharge ?? '',
      markup: r.otherTaxes ?? '', gstPct: r.gstPct || 18,
      supplierSvc: r.supplierSvc ?? '', supplierGst: r.supplierGst ?? '',
      remarks: (editing && editBooking.remarks) || '',
    };
  });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const ready = !!brCode && !!state.againstInvoice && !!state.party && !!state.counterParty && (+state.supplierAmt > 0) && !saving;

  // Saving always lands the RF/RI booking in Pending — no save-and-approve from entry
  // (any user). It posts only when approved from the Pending queue.
  const save = async () => {
    setError(''); setSaving(true);
    try {
      const reversal = {
        counterParty: state.counterParty, counterPartyGroup: 'Sundry Creditors',
        supplierAmt: +state.supplierAmt || 0, serviceCharge: +state.serviceCharge || 0,
        otherTaxes: +state.markup || 0, gstPct: +state.gstPct || 18, gstMode: state.gstMode,
        supplierSvc: +state.supplierSvc || 0, supplierGst: +state.supplierGst || 0,
        againstInvoice: state.againstInvoice, againstPurchase: state.againstPurchase || '',
      };
      const payload = {
        module: moduleCode, branch: brCode, date: state.date, gstMode: state.gstMode,
        customer: { name: state.party, ledgerName: state.party },
        supplier: { name: state.counterParty, ledgerName: state.counterParty },
        againstInvoice: state.againstInvoice, againstPurchase: state.againstPurchase || '',
        reversal, remarks: state.remarks,
      };
      const booking = editing
        ? await apiPut('/api/booking-orders/' + editBooking.id, { ...payload, editReason: 'Edit ' + kind })
        : await apiPost('/api/booking-orders', payload);
      setResult({ ...booking, _approved: false, _edited: editing });
      qc.invalidateQueries({ queryKey: ['booking-orders'] });
      if (editing) invalidateBooks(qc); // an edit reverses the prior posting → refresh every books cache
      toast(`Voucher ${booking.bookingNo || ''} saved — pending approval`);
    } catch (e) { setError(e.message || 'Failed to save'); toast(`Could not save — ${e.message || 'failed'}`, 'error'); }
    finally { setSaving(false); }
  };

  if (result) {
    const approved = result._approved;
    const fields = [['Booking No', result.bookingNo], ['Link No', result.linkNo], ['Type', kind === 'refund' ? 'Refund (RF)' : 'Reissue (RI)'], ['Status', (result.status || 'pending').toUpperCase()]];
    if (approved) fields.push(['Voucher', result.saleVno || '—']);
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 12px' }}>
        <div style={{ ...card, textAlign: 'center', padding: 28 }}>
          <div style={{ width: 54, height: 54, borderRadius: '50%', background: approved ? '#e8f6ed' : '#FEF6E6', color: approved ? '#16a34a' : GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>{approved ? <Check size={28} /> : <Clock size={28} />}</div>
          <h2 style={{ margin: '0 0 4px', fontSize: 18, color: DARK }}>{approved ? `${kind === 'refund' ? 'Refund' : 'Reissue'} approved & posted` : result._edited ? `${kind === 'refund' ? 'Refund' : 'Reissue'} updated — still Pending` : `${kind === 'refund' ? 'Refund' : 'Reissue'} saved — Pending approval`}</h2>
          <p style={{ margin: '0 0 18px', fontSize: 12.5, color: '#5b616e' }}>{approved ? <>The original sale is <b>reversed in full</b> and the {kind} voucher posted to the books.</> : <>No books impact yet — approve it under <b>Pending</b> to post.</>}</p>
          <div className="grid grid-cols-1 gap-2.5 tablet:grid-cols-2" style={{ textAlign: 'left' }}>
            {fields.map(([k, v]) => (<div key={k} style={{ padding: '8px 12px', background: '#f6f7fb', borderRadius: 8 }}><div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.6px', color: '#9197a3', textTransform: 'uppercase' }}>{k}</div><div style={{ fontSize: 13, fontWeight: 700, color: DARK }}>{v}</div></div>))}
          </div>
          {editing
            ? <button onClick={() => (onDone ? onDone() : setRoute && setRoute('/bookings/pending'))} style={{ ...btnG, marginTop: 18 }}><ArrowRight size={14} /> Back to list</button>
            : <button onClick={() => { setResult(null); setState((s) => ({ ...s, againstInvoice: '', supplierAmt: '', serviceCharge: '', markup: '' })); }} style={{ ...btnG, marginTop: 18 }}><Plus size={14} /> New {kind}</button>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '12px 10px 90px', fontFamily: HELV, color: '#1F2328', WebkitFontSmoothing: 'antialiased' }}>
      <div style={{ ...card, border: '1px solid #dfe2e7', borderLeft: '4px solid ' + GOLD, borderRadius: 4, padding: 0, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ padding: '14px 18px', background: DARK, borderBottom: '3px solid ' + GOLD, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: '0.5px', color: '#fff' }}>{editing ? `EDIT — ${editBooking.bookingNo}` : (kind === 'refund' ? 'REFUND VOUCHER' : 'REISSUE VOUCHER')}</p>
            <p style={{ margin: '2px 0 0', fontSize: 10.5, color: '#9197a3' }}>{editing
              ? <>Fix this {kind} voucher, then <b style={{ color: GOLD }}>Save changes</b> · {brCode} · returns to Pending; approve it from the Pending queue</>
              : <>Reverses the linked original sale + retained charges → one <b style={{ color: GOLD }}>Pending</b> {kind} voucher · {brCode || 'select a branch'}</>}</p>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[...VMODULE_LIST, ...REVERSAL_CHIPS].map((m) => (
              <button key={m.code} onClick={() => changeModule(m.code)}
                title={editing && m.code !== moduleCode ? `Switch this voucher to ${m.name} — the entered details are kept` : ''}
                className="inline-flex items-center max-tablet:min-h-[44px]"
                style={{ padding: '5px 11px', borderRadius: 999, border: '1px solid ' + (moduleCode === m.code ? GOLD : '#2e323c'), background: moduleCode === m.code ? GOLD : 'transparent', color: moduleCode === m.code ? '#fff' : '#9197a3', fontSize: 10.5, fontWeight: 700, cursor: m.code === moduleCode ? 'default' : 'pointer' }}>
                {m.icon} {m.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ ...card, padding: 18 }}>
        <RefundReissueFields state={state} setState={setState} ctx={{ branch: brCode, cur }} kind={kind} />
        {error && <p style={{ margin: '8px 0 0', fontSize: 12, color: CR, fontWeight: 600 }}>⚠ {error}</p>}
        <div style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'center' }}>
          {editing && (
            <span style={{ fontSize: 11, color: '#5b616e', marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Pencil size={12} /> Editing returns this voucher to Pending — approve it from the Pending queue to post the books.
            </span>
          )}
          {editing && (
            <button onClick={() => (onDone ? onDone() : setRoute && setRoute('/bookings/pending'))} className="max-tablet:min-h-[44px]" style={btnGh}><XCircle size={14} /> Cancel</button>
          )}
          <button disabled={!ready} onClick={() => save()} className="max-tablet:min-h-[44px]" style={{ ...btnG, opacity: ready ? 1 : 0.5 }}><Save size={14} /> Save (Pending)</button>
        </div>
        {!ready && <p style={{ margin: '8px 0 0', padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#854F0B' }}>Need: original invoice, customer, supplier/airline &amp; a supplier amount &gt; 0.</p>}
      </div>
    </div>
  );
}

function Section({ n, name, sub, accent, badge, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid ' + accent, borderRadius: 12, overflow: 'hidden', marginBottom: 13, boxShadow: '0 4px 16px rgba(0,0,0,.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 14px', background: accent, color: '#fff' }}>
        <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '1px', padding: '3px 9px', borderRadius: 4, background: 'rgba(255,255,255,.24)' }}>{badge || n}</span>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '2.5px', textTransform: 'uppercase' }}>{name}</span>
        <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,.92)', marginLeft: 'auto', fontStyle: 'italic' }}>{sub}</span>
      </div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  );
}

function GpCard({ k, v, color, pct, bg = '#FFFDF7' }) {
  return (
    <div style={{ border: '1px solid #F0E4C2', borderRadius: 8, padding: '12px 14px', background: bg }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.7px', color: '#9A8138', textTransform: 'uppercase' }}>{k}</div>
      <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.5px', marginTop: 4, color }}>{v}</div>
      {pct && <div style={{ fontSize: 12, fontWeight: 700, color: '#A88E48', marginTop: 2 }}>{pct}</div>}
    </div>
  );
}

// Searchable customer / supplier picker — lists existing debtor / creditor ledgers
// and auto-fills the SUB-GROUP when one is chosen (the most specific chart bucket,
// e.g. "B2B Clients" / "Supplier Air Lines"; falls back to the top group when the
// ledger has no sub-group). Typing a NEW name keeps it (default Sundry Debtors /
// Sundry Creditors) so a fresh party still works — the posting auto-creates its
// ledger on approval.
const subGroupOf = (l) => (l && (l.subGroup || l.group)) || '';
function PartyPicker({ branch, kind, value, onChange, subGroupFilter }) {
  const wantType = kind === 'customer' ? 'Debtor' : 'Creditor';
  const defaultGroup = kind === 'customer' ? 'Sundry Debtors' : 'Sundry Creditors';
  const reg = useLedgerRegistry(branch).data || [];
  const list = reg.filter((l) => l.type === wantType && (!subGroupFilter || subGroupOf(l) === subGroupFilter));
  const [open, setOpen] = useState(false);
  const q = value.name || '';
  const matches = list.filter((l) => !q || l.name.toLowerCase().includes(q.toLowerCase())).slice(0, 12);
  const setName = (v) => {
    const exact = list.find((l) => l.name.trim().toLowerCase() === v.trim().toLowerCase());
    onChange({ name: v, group: exact ? subGroupOf(exact) : (subGroupFilter || defaultGroup) });
  };
  const pick = (l) => { onChange({ name: l.name, group: subGroupOf(l) || defaultGroup }); setOpen(false); };
  const wrapRef = useRef(null);
  return (
    // ↑/↓ roam the suggestions (focus auto-scrolls each into view), Enter/Space picks, Esc
    // closes. Close on blur only when focus leaves the whole picker, so arrowing onto an
    // option (which moves focus off the input) doesn't slam the list shut.
    <div ref={wrapRef} style={{ position: 'relative' }}
      onKeyDown={listKeyNav({ onEscape: () => setOpen(false) })}
      onBlur={(e) => { if (!wrapRef.current || !wrapRef.current.contains(e.relatedTarget)) setOpen(false); }}>
      <input value={q} placeholder={kind === 'customer' ? 'Search or type customer…' : 'Search or type supplier…'}
        onChange={(e) => { setName(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)} style={inp} />
      {open && matches.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60, marginTop: 2, background: '#fff', border: '1px solid #cdd1d8', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.16)', maxHeight: 220, overflowY: 'auto' }}>
          {matches.map((l) => (
            <div key={l.id} {...clickable(() => pick(l), { role: 'option' })}
              style={{ padding: '7px 11px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11.5, outline: 'none' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f4ff')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              onFocus={(e) => (e.currentTarget.style.background = '#f0f4ff')}
              onBlur={(e) => (e.currentTarget.style.background = 'transparent')}>
              <span style={{ color: '#1a1c22', fontWeight: 500 }}>{l.name}</span>
              <span style={{ color: '#9197a3', fontSize: 9.5, flexShrink: 0 }}>{subGroupOf(l) || l.group}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   JV / posting detail view (one voucher side)
   ════════════════════════════════════════════════════════════════════════════ */
// SO/PO/GP booking JV side — now rendered by the shared JvBlock so it matches every
// other JV view (voucher shell, refund, finance).
function PostingTable({ side, accent, title }) {
  if (!side) return null;
  return <JvBlock title={title} sub={`${side.vno || ''}${side.type ? ' · ' + side.type : ''}`} postings={side.postings} color={accent} />;
}

function JournalView({ id, cur }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['booking-journal', id],
    queryFn: () => apiGet('/api/booking-orders/' + id + '/journal'),
  });
  if (isLoading) return <div style={{ padding: 14, fontSize: 12, color: '#9197a3' }}>Building JV…</div>;
  if (error) return <div style={{ padding: 14, fontSize: 12, color: '#dc2626' }}>{error.message || 'Failed to build JV'}</div>;
  if (!data) return null;
  return (
    <div>
      {data.balanced === false && (
        <div style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 8, background: '#fbe9e9', border: '1px solid #f3c9c9', color: '#dc2626', fontSize: 11.5, fontWeight: 700 }}>
          ⚠ This booking is out of balance (Debit ≠ Credit) and <b>cannot be approved</b>. Fix the SO/PO figures (Edit) so each side balances before approving.
        </div>
      )}
      {data.status !== 'approved' && data.status !== 'posted' && Array.isArray(data.errors) && data.errors.length > 0 && (
        <div style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 8, background: '#fbe9e9', border: '1px solid #f3c9c9', color: '#dc2626', fontSize: 11.5, fontWeight: 700 }}>
          ⚠ Verification failed — <b>cannot be approved</b>. Fix and re-check before approving:
          <ul style={{ margin: '4px 0 0 18px', fontWeight: 600 }}>{data.errors.map((m, i) => <li key={i}>{m}</li>)}</ul>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 10, fontSize: 11.5, color: '#5b616e' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'monospace', fontWeight: 700, color: BLUE }}><Link2 size={13} /> {data.linkNo}</span>
        <span>Gross Profit: <b style={{ color: DR }}>{cur} {fmt(data.gp?.total)}</b> ({data.gp?.pct ?? 0}%)</span>
        <span style={{ fontStyle: 'italic', color: '#9A9A9A' }}>journal entries that {data.status === 'approved' || data.status === 'posted' ? 'were posted' : 'will post on approval'}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(330px,1fr))', gap: 12 }}>
        <PostingTable side={data.purchase} accent={CR} title="Purchase invoice (Dr cost · Cr supplier)" />
        <PostingTable side={data.sale} accent={BLUE} title="Sales invoice (Dr customer · Cr sales)" />
      </div>
      <WhereItPosts approved={data.status === 'approved' || data.status === 'posted'} />
    </div>
  );
}

// Plain-English map of where the two invoices flow once approved.
function WhereItPosts({ approved }) {
  const items = [
    ['Day Book / Ledgers', 'both vouchers appear in the Day Book and each ledger statement (Sundry Debtors, Supplier, every Sales/Purchase component head, GST).'],
    ['Trial Balance', 'every Dr/Cr leg above lands in the Trial Balance under its group.'],
    ['Profit & Loss', 'each head nests in the Tally chart — Sales Accounts → module sub-group (Flights → Domestic/International Flights, Holiday Packages → Domestic/International Holidays) → DT-Base Fare / DT-K3 Tax / DT-SVC2 / DT-SVF; Purchase Accounts → … [Pur] incl. Supp SVCHG (an agency cost that reduces GP). Drill the P&L to see it head-wise.'],
    ['Balance Sheet', 'customer (Sundry Debtors, asset), supplier (Sundry Creditors, liability), CGST/SGST (Duties & Taxes) and any TCS Payable sit on the Balance Sheet.'],
    ['Sales & Purchase Registers', 'the sale shows in the Sales Register, the purchase in the Purchase Register.'],
    ['Invoice GP / Sales-GP Analytics', 'both are tied by the Link No, so GP is tracked invoice-wise.'],
    ['GST reports (GSTR-1 / 3B)', 'Output GST (sale) and Input GST (purchase) flow into the GST returns; TCS into the TCS return.'],
  ];
  return (
    <div style={{ marginTop: 14, border: '1px dashed #cdbb8e', borderRadius: 8, background: '#FDFAF4', padding: '12px 14px' }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: GOLD, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
        {approved ? '✓ Where this is posted' : 'Where this will post on approval'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: '6px 18px' }}>
        {items.map(([k, v]) => (
          <div key={k} style={{ fontSize: 11, color: '#3A3A3A', lineHeight: 1.45 }}>
            <b style={{ color: DARK }}>{k}</b> — {v}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   Pending & Approved lists
   ════════════════════════════════════════════════════════════════════════════ */
function useBookings(brCode) {
  return useQuery({
    queryKey: ['booking-orders', brCode],
    queryFn: () => apiGet('/api/booking-orders', { branch: brCode === 'ALL' ? '' : brCode }),
  });
}

// Group bookings for the "… wise" views. 'none' = bill-wise (flat).
function groupBookings(rows, by) {
  if (by !== 'client' && by !== 'supplier' && by !== 'module') return [{ key: '__all', label: null, rows }];
  const keyOf = (b) => (by === 'client' ? (b.customer?.name || '—') : by === 'supplier' ? (b.supplier?.name || '—') : (b.module || '—'));
  const labelOf = (b) => (by === 'module' ? ((VSPECS[b.module] && VSPECS[b.module].name) || b.module || '—') : keyOf(b));
  const map = new Map();
  for (const b of rows) { const k = keyOf(b); if (!map.has(k)) map.set(k, { key: k, label: labelOf(b), rows: [] }); map.get(k).rows.push(b); }
  return [...map.values()].sort((a, b) => String(a.label).localeCompare(String(b.label)));
}
const sumT = (rows, path) => rows.reduce((s, b) => s + ((b[path] && b[path].total) || 0), 0);
const gpPctOf = (gp, sale) => (sale ? (gp / sale) * 100 : 0);
const gpPctTxt = (gp, sale) => `${gpPctOf(gp, sale).toFixed(1)}%`;

function BookingTable({ rows, isLoading, cur, open, setOpen, mode, groupBy = 'none', onApprove, onCancel, onDelete, canDelete, onEdit, onRevoke, canRevoke, onInvoice, busyId, sel, onToggleSel }) {
  const cols = mode === 'approved'
    ? ['', 'Booking No', 'Booking Date', 'Link No', 'Tally Ref', 'Module', 'Sale Inv', 'Purchase Inv', 'Sale', 'Purchase', 'GP', 'GP %', 'Approved', 'Actions']
    : mode === 'rejected'
      ? ['', 'Booking No', 'Link No', 'Module', 'Customer', 'Supplier', 'Sale', 'Purchase', 'GP', 'GP %', 'Date', 'Reason']
      : mode === 'deleted'
        ? ['', 'Booking No', 'Link No', 'Module', 'Sale Inv', 'Purchase Inv', 'Sale', 'Purchase', 'GP', 'GP %', 'Deleted', 'By']
        : ['', 'Booking No', 'Booking Date', 'Link No', 'Tally Ref', 'Module', 'Customer', 'Supplier', 'Sale', 'Purchase', 'GP', 'GP %', 'Actions'];
  // The four money columns drive both header right-alignment and the group-summary
  // colSpans; derive their start from the header so adding lead columns can't misalign them.
  const numStart = cols.indexOf('Sale');
  // Page the flat (un-grouped) list so the DOM stays bounded on big branches. Grouped
  // views render in full so each group's subtotal stays correct (the grouping itself
  // already bounds how much is on screen).
  const pg = usePager(rows);
  const shown = groupBy === 'none' ? pg.pageRows : rows;
  return (
    <div style={{ ...card, padding: 0, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1080 }}>
        <thead><tr style={{ background: '#f3f4f8' }}>
          {cols.map((h, i) => <th key={i} style={{ padding: '9px 12px', fontSize: 10, fontWeight: 700, color: '#5b616e', textTransform: 'uppercase', textAlign: i >= numStart && i <= numStart + 3 ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>)}
        </tr></thead>
        <tbody>
          {isLoading && Array.from({ length: 6 }).map((_, r) => (
            <tr key={'sk' + r}><td colSpan={cols.length} style={{ padding: '8px 10px' }}><div className="kb-skeleton" style={{ height: 14, borderRadius: 6, opacity: Math.max(0.4, 1 - r * 0.12) }} /></td></tr>
          ))}
          {!isLoading && rows.length === 0 && <tr><td colSpan={cols.length} style={{ padding: 22, textAlign: 'center', color: '#9197a3', fontSize: 12 }}>{mode === 'pending' ? 'No pending vouchers. Create one under “SO/PO/GP Voucher”.' : mode === 'rejected' ? 'No rejected vouchers.' : mode === 'deleted' ? 'No deleted vouchers.' : 'No approved vouchers yet.'}</td></tr>}
          {groupBookings(shown, groupBy).map((g) => (
            <React.Fragment key={g.key}>
              {g.label != null && (
                <tr style={{ background: '#eef1f8' }}>
                  <td colSpan={numStart} style={{ padding: '7px 12px', fontWeight: 700, fontSize: 11.5, color: DARK }}>{g.label} <span style={{ color: '#9197a3', fontWeight: 600 }}>· {g.rows.length} bill{g.rows.length === 1 ? '' : 's'}</span></td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}>{fmt(sumT(g.rows, 'so'))}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}>{fmt(sumT(g.rows, 'po'))}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, color: DR, fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}>{fmt(sumT(g.rows, 'gp'))}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, color: DR, fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}>{gpPctTxt(sumT(g.rows, 'gp'), sumT(g.rows, 'so'))}</td>
                  <td colSpan={cols.length - numStart - 4}></td>
                </tr>
              )}
              {g.rows.map((b) => {
            const sp = VSPECS[b.module];
            const isOpen = open === b.id;
            return (
              <React.Fragment key={b.id}>
                <tr onClick={() => setOpen(isOpen ? null : b.id)} style={{ borderBottom: '1px solid #dfe2e7', cursor: 'pointer', background: isOpen ? '#faf7ef' : '#fff' }}>
                  <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{mode === 'pending' && onToggleSel && <input type="checkbox" checked={!!(sel && sel.has(b.id))} onChange={() => onToggleSel(b.id)} onClick={(e) => e.stopPropagation()} style={{ marginRight: 6, verticalAlign: 'middle', cursor: 'pointer' }} />}{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700, fontSize: 11.5 }}>{b.bookingNo}{mode === 'pending' && b.validation?.hasErrors ? <span title={(b.validation.errors || []).join(' · ')} style={{ marginLeft: 6, color: '#dc2626', fontWeight: 800 }}>⚠</span> : null}{mode === 'pending' && b.revokedAt ? <span title={`Revoked${b.revokedBy ? ' by ' + b.revokedBy : ''}${b.revokeReason ? ' — ' + b.revokeReason : ''}`} style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 20, background: GOLD_SOFT, color: '#8a6d12', border: '1px solid ' + GOLD_LINE, whiteSpace: 'nowrap' }}>⟲ Revoked</span> : null}</td>
                  {(mode === 'approved' || mode === 'pending') && <td style={{ padding: '8px 12px', fontSize: 11, color: '#5b616e' }}>{b.date || '—'}</td>}
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: BLUE, fontSize: 11.5 }}>{b.linkNo}</td>
                  {(mode === 'pending' || mode === 'approved') && <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11, color: '#5b616e', whiteSpace: 'nowrap' }} title="Sales / Purchase Tally Ref">{(b.saleTallyRef || '—')}{b.purTallyRef ? ' / ' + b.purTallyRef : ''}</td>}
                  <td style={{ padding: '8px 12px', fontSize: 12 }}>{sp ? sp.icon + ' ' + sp.name : b.module}</td>
                  {mode === 'approved' || mode === 'deleted' ? (
                    <>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11 }}>{b.saleVno || '—'}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11 }}>{b.purchaseVno || '—'}</td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: '8px 12px', fontSize: 12 }}>{b.customer?.name || '—'}</td>
                      <td style={{ padding: '8px 12px', fontSize: 12 }}>{b.supplier?.name || '—'}</td>
                    </>
                  )}
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}>{fmt(b.so?.total)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}>{fmt(b.po?.total)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: DR, fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}>{fmt(b.gp?.total)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: DR, fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}>{gpPctTxt(b.gp?.total || 0, b.so?.total || 0)}</td>
                  {mode !== 'pending' && <td style={{ padding: '8px 12px', fontSize: 11, color: '#5b616e' }}>{mode === 'approved' ? (b.approvedAt ? String(b.approvedAt).slice(0, 10) : '—') : mode === 'deleted' ? (b.deletedAt ? String(b.deletedAt).slice(0, 10) : '—') : b.date}</td>}
                  <td style={{ padding: '8px 12px' }} onClick={(e) => e.stopPropagation()}>
                    {mode === 'pending' ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button disabled={busyId === b.id} onClick={() => onEdit(b)} style={{ ...btnGh, padding: '4px 9px', fontSize: 10.5, color: BLUE, borderColor: '#bcd4ee' }}><Pencil size={12} /> Edit</button>
                        <button disabled={busyId === b.id || !!b.validation?.hasErrors} onClick={() => onApprove(b)} title={b.validation?.hasErrors ? 'Verification failed — ' + (b.validation.errors || []).join(' · ') : ''} style={{ ...btnG, padding: '4px 10px', fontSize: 10.5, background: b.validation?.hasErrors ? '#cfd6e4' : DR, cursor: b.validation?.hasErrors ? 'not-allowed' : 'pointer' }}>
                          {busyId === b.id ? <RefreshCw size={12} className="spin" /> : <CheckCircle2 size={12} />} Approve
                        </button>
                        <button disabled={busyId === b.id} onClick={() => onCancel(b)} style={{ ...btnGh, padding: '4px 9px', fontSize: 10.5, color: '#dc2626', borderColor: '#f3c9c9' }}><XCircle size={12} /> Reject</button>
                        {canDelete && <button disabled={busyId === b.id} onClick={() => onDelete(b)} title="Delete — remove from Pending, view-only (number not reusable)" style={{ ...btnG, padding: '4px 10px', fontSize: 10.5, background: '#dc2626' }}><Trash2 size={12} /> Delete</button>}
                      </div>
                    ) : mode === 'approved' ? (
                      // An approved booking is READ-ONLY: Revoke un-posts all its legs and
                      // returns it to Pending (edit there, then re-approve under the SAME
                      // numbers). Revoke is approver-only; Delete is admin-only.
                      <div style={{ display: 'flex', gap: 6 }}>
                        {canRevoke && onRevoke && <button disabled={busyId === b.id} onClick={() => onRevoke(b)} title="Revoke — un-post the Sales/Purchase and return this booking to Pending so it can be edited & re-approved (numbers kept)" style={{ ...btnGh, padding: '4px 9px', fontSize: 10.5, color: GOLD, borderColor: '#e3cd97' }}><RotateCcw size={12} /> Revoke</button>}
                        {canDelete && <button disabled={busyId === b.id} onClick={() => onDelete(b)} style={{ ...btnGh, padding: '4px 9px', fontSize: 10.5, color: '#dc2626', borderColor: '#f3c9c9' }}><Trash2 size={12} /> Delete</button>}
                        {!(canRevoke && onRevoke) && !canDelete && <span style={{ fontSize: 10.5, color: '#b0b7cc' }}>—</span>}
                      </div>
                    ) : mode === 'deleted' ? (
                      <span style={{ fontSize: 11, color: '#9197a3' }} title={b.deletedReason || ''}>{b.deletedBy || '—'}{b.deletedReason ? ` · ${b.deletedReason}` : ''}</span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#9197a3' }}>{b.rejectedReason || '—'}</span>
                    )}
                  </td>
                </tr>
                {isOpen && (
                  <tr><td colSpan={cols.length} style={{ padding: '12px 16px', background: '#faf9f5', borderBottom: '1px solid #eee3cf' }}>
                    {onInvoice && (b.status === 'approved' || b.status === 'posted') && (
                      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                        <button onClick={() => onInvoice(b, 'sale')} style={{ ...btnGh, padding: '4px 10px', fontSize: 10.5, color: BLUE, borderColor: '#bcd4ee' }}>🧾 Sales Invoice</button>
                        {!b.noSupplier && <button onClick={() => onInvoice(b, 'purchase')} style={{ ...btnGh, padding: '4px 10px', fontSize: 10.5 }}>📄 Purchase Invoice</button>}
                      </div>
                    )}
                    <JournalView id={b.id} cur={cur} />
                  </td></tr>
                )}
              </React.Fragment>
            );
          })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      {groupBy === 'none' && <Pager pager={pg} />}
    </div>
  );
}

// Bill-wise / Client-wise / Supplier-wise / Module-wise grouping toggle.
function GroupByBar({ value, onChange }) {
  const OPTS = [['none', 'Bill wise'], ['client', 'Client wise'], ['supplier', 'Supplier wise'], ['module', 'Module wise']];
  return (
    <div style={{ display: 'inline-flex', border: '1px solid #cdd1d8', borderRadius: 7, overflow: 'hidden', marginBottom: 12 }}>
      {OPTS.map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)}
          style={{ padding: '6px 12px', fontSize: 11.5, fontWeight: 600, border: 'none', cursor: 'pointer', background: value === v ? BLUE : '#fff', color: value === v ? '#fff' : '#5b616e' }}>{l}</button>
      ))}
    </div>
  );
}

export function PendingBookings({ branch, setRoute }) {
  const brCode = brCodeOf(branch) || 'ALL';
  const cur = bc(branch).cur;
  const qc = useQueryClient();
  const { data = [], isLoading } = useBookings(brCode);
  const [open, setOpen] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState('');
  const [editing, setEditing] = useState(null);
  const [groupBy, setGroupBy] = useState('none');
  const [sel, setSel] = useState(() => new Set());
  const [range, setRange] = useState(() => periodRange('all', { branch })); // default All so Pending shows everything
  const inRange = (dt) => (!range.from || dt >= range.from) && (!range.to || dt <= range.to);

  const rows = data.filter((b) => b.status === 'pending' && inRange(b.date || ''));
  const allIds = rows.map((b) => b.id);
  const toggleSel = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAllSel = () => setSel((s) => (s.size === allIds.length ? new Set() : new Set(allIds)));

  // Editing a pending voucher reuses the full SO/PO/GP entry form (PUT on save).
  if (editing) {
    return <SoPoGpVoucherEntry branch={branch} setRoute={setRoute} editBooking={editing}
      onDone={() => { setEditing(null); setOpen(null); qc.invalidateQueries({ queryKey: ['booking-orders'] }); }} />;
  }

  const onApprove = async (b) => {
    setBusyId(b.id); setMsg('');
    try {
      const res = await apiPost('/api/booking-orders/' + b.id + '/approve');
      setMsg(res.noSupplier
        ? `✓ Approved ${b.bookingNo}. Posted Sales ${res.saleVno} (no purchase leg) under Link ${res.linkNo}.`
        : `✓ Approved ${b.bookingNo}. Posted Sales ${res.saleVno} + Purchase ${res.purchaseVno} under Link ${res.linkNo}.`);
      qc.invalidateQueries({ queryKey: ['booking-orders'] });
      invalidateBooks(qc); // posting spawns Sale+Purchase journals → refresh every books cache
    } catch (e) { setMsg('⚠ ' + (e.message || 'Approve failed')); }
    finally { setBusyId(null); }
  };
  const onCancel = async (b) => {
    const { confirmed, reason } = await confirmDialog({ title: `Reject voucher ${b.bookingNo}?`, message: 'It will be marked Rejected (no books impact).', danger: true, reasonRequired: true, reasonLabel: 'Reason for rejection', confirmLabel: 'Reject' });
    if (!confirmed) return;
    setBusyId(b.id);
    try { await apiPost('/api/booking-orders/' + b.id + '/reject', { reason }); qc.invalidateQueries({ queryKey: ['booking-orders'] }); setOpen(null); setMsg(`✓ Rejected ${b.bookingNo}.`); }
    catch (e) { setMsg('⚠ ' + (e.message || 'Reject failed')); }
    finally { setBusyId(null); }
  };
  const onApproveSelected = async () => {
    if (!sel.size) return;
    const { confirmed } = await confirmDialog({ title: `Approve ${sel.size} selected voucher(s)?`, message: 'Each posts its linked Sales + Purchase.', confirmLabel: 'Approve' });
    if (!confirmed) return;
    setBusyId('bulk'); setMsg(`⏳ Approving ${sel.size} voucher(s)… please wait.`);
    try {
      const res = await apiPost('/api/booking-orders/approve-many', { ids: [...sel] });
      setMsg(`✓ Approved ${res.approved} of ${res.total}${res.failed ? ` · ${res.failed} failed` : ''}.`);
      setSel(new Set()); qc.invalidateQueries({ queryKey: ['booking-orders'] });
      invalidateBooks(qc); // each posting spawns Sale+Purchase journals → refresh every books cache
    } catch (e) { setMsg('⚠ ' + (e.message || 'Bulk approve failed')); }
    finally { setBusyId(null); }
  };

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '12px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, color: DARK, display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={18} style={{ color: GOLD }} /> Pending Approval</h2>
          <p style={{ margin: 0, fontSize: 11.5, color: '#5b616e' }}>These have <b>no books impact</b> yet. Expand a row to review the full JV, then <b>Approve &amp; Post</b> to generate the linked Sales &amp; Purchase invoices.</p>
        </div>
        <button onClick={() => setRoute && setRoute('/bookings/new')} className="max-tablet:min-h-[44px]" style={btnG}><Plus size={14} /> New voucher</button>
      </div>
      {msg && <div style={{ ...card, marginBottom: 12, fontSize: 12, color: msg.startsWith('⚠') ? '#dc2626' : '#16a34a', background: msg.startsWith('⚠') ? '#fbe9e9' : '#e8f6ed', border: '1px solid ' + (msg.startsWith('⚠') ? '#f3c9c9' : '#cde3b6') }}>{msg}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
        <PeriodBar branch={branch} compact defaultPreset="all" onChange={setRange} />
        <GroupByBar value={groupBy} onChange={setGroupBy} />
        {rows.length > 0 && (
          <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <button onClick={toggleAllSel} style={{ ...btnGh, padding: '5px 11px', fontSize: 11, color: BLUE, borderColor: '#bcd4ee' }}>{sel.size === allIds.length ? '☑ Clear' : `☐ Select all (${allIds.length})`}</button>
            {sel.size > 0 && <button disabled={busyId === 'bulk'} onClick={onApproveSelected} style={{ ...btnG, padding: '5px 13px', fontSize: 11.5, background: DR }}>{busyId === 'bulk' ? <RefreshCw size={12} className="spin" /> : <CheckCircle2 size={12} />} {busyId === 'bulk' ? 'Approving…' : `Approve selected (${sel.size})`}</button>}
          </span>
        )}
      </div>
      <BookingTable rows={rows} isLoading={isLoading} cur={cur} open={open} setOpen={setOpen} mode="pending" groupBy={groupBy} onApprove={onApprove} onCancel={onCancel} onEdit={setEditing} busyId={busyId} sel={sel} onToggleSel={toggleSel} />
    </div>
  );
}

const isAdminRole = (u) => ['Super Admin', 'Director'].includes(u?.role);
// Revoking un-posts a posted booking — approver-level roles only (the server enforces
// this too; this just gates the button). Stricter than approving, looser than delete.
const isApproverRole = (u) => ['Super Admin', 'Director', 'Senior Finance Manager', 'Sr. Accounts Executive'].includes(u?.role);

// Shared Revoke handler factory for the booking screens — runs the server preflight so
// the dialog shows the blast radius (which legs un-post) and any warnings, blocks on a
// hard block, requires a reason, then posts the revoke and refreshes both books roots.
function makeOnRevoke({ qc, setBusyId, setOpen, toastFn }) {
  return async (b) => {
    let pre = null;
    try { pre = await apiGet('/api/booking-orders/' + b.id + '/revoke-check'); }
    catch (e) { toastFn(e.message || 'Could not check this booking', 'error'); return; }
    if (pre && (pre.blocks || []).length) { toastFn(`Can't revoke — ${pre.blocks.map((x) => x.msg).join(' ')}`, 'error'); return; }
    const warns = (pre?.warnings || []).map((w) => w.msg).filter(Boolean);
    const legs = (pre?.legs || []).filter(Boolean);
    const { confirmed, reason } = await confirmDialog({
      title: `Revoke booking ${b.bookingNo}?`,
      message: `This un-posts its ${legs.length || ''} spawned invoice(s)${legs.length ? ` (${legs.join(', ')})` : ''} and returns the booking to Pending for editing & re-approval (the numbers are kept).${warns.length ? ' Note: ' + warns.join(' ') : ''}`,
      danger: true, reasonRequired: true, reasonLabel: 'Reason for revoke', confirmLabel: 'Revoke',
    });
    if (!confirmed) return;
    setBusyId(b.id);
    try { await apiPost('/api/booking-orders/' + b.id + '/revoke', { reason }); qc.invalidateQueries({ queryKey: ['booking-orders'] }); invalidateBooks(qc); setOpen(null); toastFn(`Revoked ${b.bookingNo} → Pending`); }
    catch (e) { toastFn(e.message || 'Revoke failed', 'error'); }
    finally { setBusyId(null); }
  };
}

export function ApprovedBookings({ branch, setRoute, currentUser }) {
  const brCode = brCodeOf(branch) || 'ALL';
  const cur = bc(branch).cur;
  const qc = useQueryClient();
  const { data = [], isLoading } = useBookings(brCode);
  const [open, setOpen] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [groupBy, setGroupBy] = useState('none');
  const canDelete = isAdminRole(currentUser);
  const canRevoke = isApproverRole(currentUser);
  const onRevoke = makeOnRevoke({ qc, setBusyId, setOpen, toastFn: toast });

  const rows = data.filter((b) => b.status === 'approved' || b.status === 'posted');

  // Admin-only delete: reverses the posted Sales/Purchase out of the books (no
  // accounting effect) and keeps a view-only record under Deleted; the numbers are
  // never reused.
  const onDelete = async (b) => {
    if (!canDelete) return;
    const { confirmed, reason } = await confirmDialog({ title: `Delete approved booking ${b.bookingNo}?`, message: `Its Sales (${b.saleVno}) & Purchase (${b.purchaseVno}) invoices will be reversed out of the books. The record stays view-only under Deleted and its numbers can never be reused.`, danger: true, reasonRequired: true, reasonLabel: 'Reason for deletion', confirmLabel: 'Delete' });
    if (!confirmed) return;
    setBusyId(b.id);
    try { await apiPost('/api/booking-orders/' + b.id + '/delete', { reason }); qc.invalidateQueries({ queryKey: ['booking-orders'] }); invalidateBooks(qc); setOpen(null); toast(`Deleted ${b.bookingNo} & reversed out of the books`); }
    catch (e) { toast(e.message || 'Delete failed', 'error'); }
    finally { setBusyId(null); }
  };

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '12px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, color: DARK, display: 'flex', alignItems: 'center', gap: 8 }}><FileCheck2 size={18} style={{ color: DR }} /> Approved &amp; Posted</h2>
          <p style={{ margin: 0, fontSize: 11.5, color: '#5b616e' }}>Posted to the books as linked Sales + Purchase invoices. Expand to see the JV &amp; ledger posting. The <b>Link No</b> tracks invoice-wise GP everywhere.{canDelete ? ' Admins can Delete a booking — it reverses out of the books and is kept view-only under Deleted.' : ''}</p>
        </div>
        <button onClick={() => setRoute && setRoute('/bookings/pending')} style={btnGh}><Clock size={14} /> View pending</button>
      </div>
      <div><GroupByBar value={groupBy} onChange={setGroupBy} /></div>
      <BookingTable rows={rows} isLoading={isLoading} cur={cur} open={open} setOpen={setOpen} mode="approved" groupBy={groupBy} onDelete={onDelete} canDelete={canDelete} onRevoke={onRevoke} canRevoke={canRevoke} busyId={busyId} />
    </div>
  );
}

export function DeletedBookings({ branch, setRoute }) {
  const brCode = brCodeOf(branch) || 'ALL';
  const cur = bc(branch).cur;
  const { data = [], isLoading } = useBookings(brCode);
  const [open, setOpen] = useState(null);

  const rows = data.filter((b) => b.status === 'deleted');

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '12px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, color: DARK, display: 'flex', alignItems: 'center', gap: 8 }}><Trash2 size={18} style={{ color: '#dc2626' }} /> Deleted</h2>
          <p style={{ margin: 0, fontSize: 11.5, color: '#5b616e' }}>Approved bookings an admin deleted. They were <b>reversed out of the books</b> (no accounting effect). This is a <b>view-only</b> audit trail — the Booking No, Link No and Sale/Purchase invoice numbers shown here are <b>permanently retired and can never be reused</b>.</p>
        </div>
        <button onClick={() => setRoute && setRoute('/bookings/approved')} style={btnGh}><FileCheck2 size={14} /> View approved</button>
      </div>
      <BookingTable rows={rows} isLoading={isLoading} cur={cur} open={open} setOpen={setOpen} mode="deleted" busyId={null} />
    </div>
  );
}

// Unified SO/PO/GP approval — Pending · Approved · Rejected · Deleted in one screen
// with internal tabs (mirrors Voucher Approvals). Reuses BookingTable + all actions.
export function BookingApprovals({ branch, setRoute, currentUser }) {
  const brCode = brCodeOf(branch) || 'ALL';
  const cur = bc(branch).cur;
  const qc = useQueryClient();
  const { data = [], isLoading } = useBookings(brCode);
  const custs = useQuery({ queryKey: ['customers'], queryFn: () => apiGet('/api/customers') }).data || [];
  const sups = useQuery({ queryKey: ['suppliers'], queryFn: () => apiGet('/api/suppliers') }).data || [];
  const partyBy = (arr) => { const m = {}; (arr || []).forEach((x) => { if (x && x.name) m[String(x.name).toLowerCase().trim()] = x; }); return m; };
  const custMap = partyBy(custs), supMap = partyBy(sups);
  const [status, setStatus] = useState('pending');
  const [open, setOpen] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState('');
  const [editing, setEditing] = useState(null);
  const [groupBy, setGroupBy] = useState('none');
  const [sel, setSel] = useState(() => new Set());
  const [range, setRange] = useState(() => periodRange('all', { branch })); // default All so Pending shows everything
  const [search, setSearch] = useState('');
  const canDelete = isAdminRole(currentUser);
  const inRange = (dt) => (!range.from || dt >= range.from) && (!range.to || dt <= range.to);
  // Search filters the visible list by Booking No, Link No, module, customer, supplier,
  // posted Sale/Purchase Vch No, or amount. Counts (tab badges) stay unfiltered.
  const needle = search.trim().toLowerCase();
  const matchBooking = (b) => {
    if (!needle) return true;
    const hay = [b.bookingNo, b.linkNo, b.module, b.customer && b.customer.name, b.supplier && b.supplier.name, b.saleVno, b.purchaseVno, String(Math.round(b.saleTotal || 0))].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(needle);
  };
  // Newest first: date desc, then Booking No desc (numeric-aware) as a stable tiebreak.
  const cmpLatest = (a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.bookingNo || '').localeCompare(String(a.bookingNo || ''), undefined, { numeric: true });

  // Bookings edited ≥ once (cross-cuts status) — its own source for the Edited tab.
  const editedQ = useQuery({ queryKey: ['booking-edited', brCode], queryFn: () => apiGet('/api/booking-orders/edited', { branch: brCode === 'ALL' ? '' : brCode }) });
  const editedRows = (editedQ.data || []).filter((r) => inRange(r.date || ''));
  const editedVisible = editedRows
    .filter((r) => !needle || [r.bookingNo, r.linkNo, r.module, r.customer, r.lastBy, r.lastReason, String(Math.round(r.saleTotal || 0))].filter(Boolean).join(' ').toLowerCase().includes(needle))
    .slice().sort((a, b) => String(b.lastAt || '').localeCompare(String(a.lastAt || '')));
  const bucket = (b) => (b.status === 'posted' ? 'approved' : b.status);
  const counts = { pending: 0, approved: 0, rejected: 0, deleted: 0, edited: editedRows.length };
  data.forEach((b) => { if (counts[bucket(b)] !== undefined && inRange(b.date || '')) counts[bucket(b)]++; });
  const rows = data.filter((b) => bucket(b) === status && inRange(b.date || '') && matchBooking(b)).sort(cmpLatest);
  const allIds = rows.map((b) => b.id);
  const toggleSel = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAllSel = () => setSel((s) => (s.size === allIds.length ? new Set() : new Set(allIds)));
  React.useEffect(() => { setSel(new Set()); }, [status, brCode]);

  if (editing) {
    return <SoPoGpVoucherEntry branch={branch} setRoute={setRoute} editBooking={editing}
      onDone={() => { setEditing(null); setOpen(null); qc.invalidateQueries({ queryKey: ['booking-orders'] }); }} />;
  }

  const onApprove = async (b) => {
    setBusyId(b.id); setMsg('');
    try { const res = await apiPost('/api/booking-orders/' + b.id + '/approve'); setMsg(res.noSupplier ? `✓ Approved ${b.bookingNo}. Posted Sales ${res.saleVno} (no purchase leg).` : `✓ Approved ${b.bookingNo}. Posted Sales ${res.saleVno} + Purchase ${res.purchaseVno}.`); qc.invalidateQueries({ queryKey: ['booking-orders'] }); invalidateBooks(qc); }
    catch (e) { setMsg('⚠ ' + (e.message || 'Approve failed')); } finally { setBusyId(null); }
  };
  // Open the editor. Editing an already-approved booking reverses its posted Sales/
  // Purchase out of the books and returns it to Pending for re-approval — warn first.
  const onEdit = async (b) => {
    if (b.status === 'approved' || b.status === 'posted') {
      const { confirmed } = await confirmDialog({ title: `Edit approved booking ${b.bookingNo}?`, message: `Its posted Sales (${b.saleVno})${b.noSupplier ? '' : ` & Purchase (${b.purchaseVno})`} will be reversed out of the books and the booking returns to Pending for re-approval.`, danger: true, confirmLabel: 'Edit & reverse' });
      if (!confirmed) return;
    }
    setEditing(b);
  };
  const onCancel = async (b) => {
    const { confirmed, reason } = await confirmDialog({ title: `Reject voucher ${b.bookingNo}?`, message: 'Marked Rejected (no books impact).', danger: true, reasonRequired: true, reasonLabel: 'Reason for rejection', confirmLabel: 'Reject' });
    if (!confirmed) return;
    setBusyId(b.id);
    try { await apiPost('/api/booking-orders/' + b.id + '/reject', { reason }); qc.invalidateQueries({ queryKey: ['booking-orders'] }); setOpen(null); setMsg(`✓ Rejected ${b.bookingNo}.`); }
    catch (e) { setMsg('⚠ ' + (e.message || 'Reject failed')); } finally { setBusyId(null); }
  };
  const onDelete = async (b) => {
    if (!canDelete) return;
    // A pending booking hasn't posted, so there's nothing to reverse — only the
    // approved-tab delete unwinds the posted Sales/Purchase. Either way the number is burned.
    const posted = b.status === 'approved' || b.status === 'posted';
    const { confirmed, reason } = await confirmDialog({ title: `Delete ${posted ? 'approved ' : ''}booking ${b.bookingNo}?`, message: posted ? `Its Sales (${b.saleVno}) & Purchase (${b.purchaseVno}) are reversed out of the books; kept view-only under Deleted, numbers never reused.` : `It has no books impact; kept view-only under Deleted, numbers never reused.`, danger: true, reasonRequired: true, reasonLabel: 'Reason for deletion', confirmLabel: 'Delete' });
    if (!confirmed) return;
    setBusyId(b.id);
    try { await apiPost('/api/booking-orders/' + b.id + '/delete', { reason }); qc.invalidateQueries({ queryKey: ['booking-orders'] }); invalidateBooks(qc); setOpen(null); setMsg(`✓ Deleted ${b.bookingNo}.`); }
    catch (e) { setMsg('⚠ ' + (e.message || 'Delete failed')); } finally { setBusyId(null); }
  };
  const canRevoke = isApproverRole(currentUser);
  const onRevoke = makeOnRevoke({ qc, setBusyId, setOpen, toastFn: (m, kind) => setMsg((kind === 'error' ? '⚠ ' : '✓ ') + m) });
  const onApproveSelected = async () => {
    if (!sel.size) return;
    const { confirmed } = await confirmDialog({ title: `Approve ${sel.size} selected voucher(s)?`, message: 'Each posts its linked Sales + Purchase.', confirmLabel: 'Approve' });
    if (!confirmed) return;
    setBusyId('bulk'); setMsg(`⏳ Approving ${sel.size} voucher(s)… please wait.`);
    try { const res = await apiPost('/api/booking-orders/approve-many', { ids: [...sel] }); setMsg(`✓ Approved ${res.approved} of ${res.total}${res.failed ? ` · ${res.failed} failed` : ''}.`); setSel(new Set()); qc.invalidateQueries({ queryKey: ['booking-orders'] }); invalidateBooks(qc); }
    catch (e) { setMsg('⚠ ' + (e.message || 'Bulk approve failed')); } finally { setBusyId(null); }
  };

  const tab = (k, label) => (
    <button key={k} onClick={() => setStatus(k)} className="max-tablet:min-h-[44px]" style={{ padding: '8px 16px', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: `3px solid ${status === k ? GOLD : 'transparent'}`, background: 'transparent', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: status === k ? DARK : '#5b616e' }}>{label} <span style={{ fontSize: 11, color: '#9197a3' }}>({counts[k]})</span></button>
  );

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '12px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, color: DARK }}>SO/PO/GP Approvals</h2>
          <p style={{ margin: 0, fontSize: 11.5, color: '#5b616e' }}>Pending have no books impact; approving posts the linked Sales + Purchase. Deleted are reversed out & view-only.</p>
        </div>
        <button onClick={() => setRoute && setRoute('/bookings/new')} className="max-tablet:min-h-[44px]" style={btnG}><Plus size={14} /> New voucher</button>
      </div>
      <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 10 }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #cdd1d8', flexWrap: 'wrap' }}>{tab('pending', 'Pending')}{tab('approved', 'Approved')}{tab('rejected', 'Rejected')}{tab('deleted', 'Deleted')}{tab('edited', 'Edited')}</div>
      </div>
      {msg && <div style={{ ...card, marginBottom: 12, fontSize: 12, padding: '8px 12px', color: msg.startsWith('⚠') ? '#dc2626' : '#16a34a', background: msg.startsWith('⚠') ? '#fbe9e9' : '#e8f6ed', border: '1px solid ' + (msg.startsWith('⚠') ? '#f3c9c9' : '#cde3b6') }}>{msg}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
        <GroupByBar value={groupBy} onChange={setGroupBy} />
        <div style={{ position: 'relative', flex: '0 1 360px', minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#9197a3', pointerEvents: 'none' }}>🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Booking No · Link · customer · supplier · amount…"
            aria-label="Search bookings"
            style={{ width: '100%', padding: '6px 26px 6px 28px', border: '1px solid #cdd1d8', borderRadius: 7, fontSize: 12, outline: 'none', background: '#fff' }}
          />
          {search && <button onClick={() => setSearch('')} aria-label="Clear search" style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#9197a3', fontSize: 14, lineHeight: 1 }}>✕</button>}
        </div>
        {needle && <span style={{ fontSize: 11, color: '#5b616e', fontWeight: 700 }}>{(status === 'edited' ? editedVisible.length : rows.length)} match{(status === 'edited' ? editedVisible.length : rows.length) === 1 ? '' : 'es'}</span>}
        {status === 'pending' && rows.length > 0 && (
          <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <button onClick={toggleAllSel} style={{ ...btnGh, padding: '5px 11px', fontSize: 11, color: BLUE, borderColor: '#bcd4ee' }}>{sel.size === allIds.length ? '☑ Clear' : `☐ Select all (${allIds.length})`}</button>
            {sel.size > 0 && <button disabled={busyId === 'bulk'} onClick={onApproveSelected} style={{ ...btnG, padding: '5px 13px', fontSize: 11.5, background: DR }}>{busyId === 'bulk' ? <RefreshCw size={12} className="spin" /> : <CheckCircle2 size={12} />} {busyId === 'bulk' ? 'Approving…' : `Approve selected (${sel.size})`}</button>}
          </span>
        )}
      </div>
      {status === 'edited'
        ? <EditedBookingsList rows={editedVisible} isLoading={editedQ.isLoading} cur={cur} open={open} setOpen={setOpen} />
        : <BookingTable rows={rows} isLoading={isLoading} cur={cur} open={open} setOpen={setOpen} mode={status} groupBy={groupBy} onApprove={onApprove} onCancel={onCancel} onEdit={onEdit} onDelete={onDelete} canDelete={canDelete} onRevoke={onRevoke} canRevoke={canRevoke} onInvoice={(b, side) => { const master = side === 'sale' ? custMap[String(b.customer?.name || '').toLowerCase().trim()] : supMap[String(b.supplier?.name || '').toLowerCase().trim()]; printBookingInvoice({ booking: b, side, branch, master, title: `${side === 'sale' ? 'Sales Invoice' : 'Purchase Invoice'} · ${b.bookingNo}` }); }} busyId={busyId} sel={sel} onToggleSel={toggleSel} />}
    </div>
  );
}

// The "Edited" tab body for SO/PO/GP — one row per booking edited ≥ once, expanding
// to its full audit timeline (who/when/why + field-level changes + full snapshot) and
// the live JV. Cross-cuts status: an approved booking that was later edited shows here.
function EditedBookingsList({ rows, isLoading, cur, open, setOpen }) {
  const th = { padding: '7px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#5b616e', textTransform: 'uppercase', letterSpacing: 0.3, borderBottom: '2px solid #cdd1d8', whiteSpace: 'nowrap' };
  const td = { padding: '7px 10px', borderBottom: '1px solid #dfe2e7', fontSize: 12, whiteSpace: 'nowrap' };
  if (isLoading) return <div style={{ ...card, padding: 22, textAlign: 'center', color: '#9197a3' }}>Loading edited bookings…</div>;
  if (!rows.length) return <div style={{ ...card, padding: 22, textAlign: 'center', color: '#9197a3' }}>No edited bookings in this period.</div>;
  const fmtAt = (s) => { const d = new Date(s); return isNaN(d) ? (s || '—') : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
  return (
    <div style={{ ...card, padding: 0, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
        <thead><tr>{['', 'Booking No', 'Link No', 'Module', 'Customer', 'Sale', 'Status', 'Edits', 'Last edited', 'Last reason'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => {
            const isOpen = open === 'edit:' + r.id;
            return (
              <React.Fragment key={r.id}>
                <tr onClick={() => setOpen(isOpen ? null : 'edit:' + r.id)} style={{ cursor: 'pointer', background: isOpen ? '#fbfcfe' : '#fff' }}>
                  <td style={{ ...td, color: GOLD, fontWeight: 800 }}>{isOpen ? '▾' : '▸'}</td>
                  <td style={{ ...td, fontWeight: 700, color: BLUE }}>{r.bookingNo}</td>
                  <td style={{ ...td, fontFamily: 'monospace', color: '#5b616e' }}>{r.linkNo || '—'}</td>
                  <td style={td}>{r.module}</td>
                  <td style={{ ...td, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.customer || '—'}</td>
                  <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>{cur} {Math.round(r.saleTotal || 0).toLocaleString(localeOf(cur))}</td>
                  <td style={td}><span style={{ fontSize: 10.5, fontWeight: 700, color: '#5b616e', textTransform: 'capitalize' }}>{r.status}</span></td>
                  <td style={{ ...td, textAlign: 'center' }}><span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: '#FFF6D6', color: '#8a6d12' }}>{r.edits}{r.preAudit ? '*' : ''}</span></td>
                  <td style={td}>{r.lastBy || 'unknown'} · {fmtAt(r.lastAt)}</td>
                  <td style={{ ...td, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', color: '#5b616e' }} title={r.lastReason || ''}>{r.lastReason || (r.preAudit ? '— pre-audit —' : '—')}</td>
                </tr>
                {isOpen && (
                  <tr><td colSpan={10} style={{ padding: 12, background: '#f7f8fb', borderBottom: '1px solid #cdd1d8' }}>
                    <div style={{ fontWeight: 800, fontSize: 12, color: DARK, marginBottom: 8 }}>Audit trail — {r.bookingNo}</div>
                    <AuditTrail entityType="booking" entityId={r.id} cur={cur} />
                  </td></tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function RejectedBookings({ branch, setRoute }) {
  const brCode = brCodeOf(branch) || 'ALL';
  const cur = bc(branch).cur;
  const { data = [], isLoading } = useBookings(brCode);
  const [open, setOpen] = useState(null);
  const [groupBy, setGroupBy] = useState('none');

  const rows = data.filter((b) => b.status === 'rejected');

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '12px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, color: DARK, display: 'flex', alignItems: 'center', gap: 8 }}><XCircle size={18} style={{ color: '#dc2626' }} /> Rejected</h2>
          <p style={{ margin: 0, fontSize: 11.5, color: '#5b616e' }}>Declined SO/PO/GP vouchers. They <b>never touched the books</b> (no Sales/Purchase invoices posted). Expand a row to review what was entered.</p>
        </div>
        <button onClick={() => setRoute && setRoute('/bookings/pending')} style={btnGh}><Clock size={14} /> View pending</button>
      </div>
      <div><GroupByBar value={groupBy} onChange={setGroupBy} /></div>
      <BookingTable rows={rows} isLoading={isLoading} cur={cur} open={open} setOpen={setOpen} mode="rejected" groupBy={groupBy} busyId={null} />
    </div>
  );
}
