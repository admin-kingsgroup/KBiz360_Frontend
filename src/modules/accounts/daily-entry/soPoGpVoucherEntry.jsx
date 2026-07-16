/* ════════════════════════════════════════════════════════════════════
   SO / PO / GP VOUCHER (approval-gated)  /bookings/new, /bookings/inter-branch
   Travkings-style combined voucher across all 7 modules. The user fills the
   Purchase grid (cost) + per-line markup & service charge; the Sales side derives,
   Gross Profit shows live. Saving creates a PENDING voucher — NO books impact.
   It then appears under Pending; an approver reviews the full JV (which ledger,
   which group, Dr/Cr) and Approves & Posts → that spawns the linked LOCKED Sales
   + Purchase vouchers (and their double-entry), and it moves to Approved. One
   Link No ties SO/PO/GP so profit is tracked invoice-wise.

   BUSINESS SUB-MODULE REORG (2026-07-13): moved out of bookingOrder/legacy.jsx
   (MENU_ACCOUNTS ▸ Daily Entry ▸ Sales & Inter-Branch). bookingOrder/legacy.jsx
   keeps the booking-list/approval-queue family (PendingBookings, ApprovedBookings,
   DeletedBookings, BookingApprovals, RejectedBookings — BookingApprovals is used
   by modules/approvals, a separate top-level Approvals nav module, not Accounts)
   and re-exports rowsForEdit/inbRowsFromDeal/ALLOWED_LEG_MODULES/legToPayload/
   SoPoGpVoucherEntry from here for its own tests + App.jsx's barrel import.
   ════════════════════════════════════════════════════════════════════ */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, Trash2, Save, ArrowRight, Check, Lock, RefreshCw, Clock, CheckCircle2,
  XCircle, ChevronDown, ChevronRight, Link2, FileCheck2, Pencil, RotateCcw,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { inp, card, btnG, btnGh, FL, bc } from '../../../core/styles.jsx';
import { Menu as DropdownMenu } from '../../../core/ux/Menu';
import { useModalEsc } from '../../../core/ux/useModalEsc';
import { localeOf } from '../../../core/format';
import { PeriodBar, periodRange } from '../../../core/period';
import { printBookingInvoice } from '../../../core/printInvoice';
import { apiGet, apiPost, apiPut } from '../../../core/api';
import { useApprovalChain, nextActionFor, StageChip } from '../../../core/approvalChain';
import { useOpenInb, useBookInb, useCreateInb, useUpdateInb } from '../../../core/useInterBranchVoucher';
import { useVNo } from '../../../core/useNextNo';

// Inter-branch jurisdiction (mirror of backend inb.service.COUNTRY): same country (India) = IGST;
// different country = cross-border export (zero-rated on the seller side). These codes are PRINTED
// in the tax-treatment banner, so they must be the real ISO ones — FBM is Lubumbashi, DR Congo =
// 'CD' (it read 'FB', which is not a country, and the banner showed "zero-rated (IN→FB)").
const INB_COUNTRY = { BOM: 'IN', AMD: 'IN', BOMMB: 'IN', NBO: 'KE', DAR: 'TZ', FBM: 'CD' };
const INB_ALL = ['BOM', 'AMD', 'NBO', 'DAR', 'FBM', 'BOMMB'];
const inbCrossBorder = (from, to) => (INB_COUNTRY[from] || 'IN') !== (INB_COUNTRY[to] || 'IN');
// An India-jurisdiction seller bills IGST on its inter-branch Service Fee even cross-border to
// Africa (the India side's output tax must reconcile); the Africa buyer can't reclaim Indian GST,
// so it books the tax-inclusive amount as COST (bookingOrders.buildInbBuyerBookingPayload). This
// is the SELLER'S JURISDICTION, not one branch: BOM, AMD and BOMMB all bill. Mirrors the backend
// fallback in inb.service.inbTaxTreatment — keep the two in step.
// Resolved from the map, NOT via a defaulted 'IN': an unmapped/lowercase code must not default the
// tick ON and make an Africa seller bill tax. Case-folded to match the backend (inbTaxTreatment),
// which is authoritative — a tick defaulted ON is honoured verbatim there (billIgst===true wins over
// the jurisdiction fallback), so an FE/BE disagreement here would bill real VAT on a real export.
const inbIndiaSeller = (from) => INB_COUNTRY[String(from || '').toUpperCase().trim()] === 'IN';
import { AuditTrail } from '../../../core/AuditTrail';
import { useLedgerRegistry } from '../../../core/useReference';
import { supplyTypeOf, stateNameOf, stateCodeOf, homeStateNameForBranch } from '../../../core/gstSupply';
import { STATE_NAMES } from '../../../core/partyEnums';
import { useFormKeys } from '../../../core/ux/forms';
import { toast } from '../../../core/ux/toast';
import { confirmDialog } from '../../../core/ux/confirm';
import { clickable } from '../../../core/ux/clickable';
import { listKeyNav } from '../../../core/ux/listKeys';
import { usePager, Pager } from '../../../core/ux/pager';
import { SmartDateInput } from '../../../core/ux/SmartDateInput';
import { JvBlock } from '../../../core/voucher/JvBlock';
import {
  VSPECS, VMODULE_LIST, blankLine, blankSector, normalizeLine, syncLineRefs, bookingTotals, tcs206cRate, lineCalc, isVatBranch, rowsFromSnapshots, fareSum,
} from '../../../core/voucherSpecs.js';
import { useMasterList } from '../../../core/useMasters';
import { RefundReissueFields } from '../../../core/voucher/fields/RefundReissueFields';
import { useRefundLiveAmount } from '../../../core/voucher/useRefundLiveAmount';
import { invalidateBooks, useVoucherApprovals, useApproveMany, useApproveVoucher, useRejectVoucher } from '../../../core/useAccounting';
import { VoucherEditor } from '../../accountingLive';

const GOLD = '#A07828', DARK = '#141414', DR = '#1A7A42', CR = '#C0392B', BLUE = '#2563eb';
// Gold theme tokens + per-section bar accents (SO / PO / GP voucher theme).
const GOLD_DEEP = '#6B4E0F', GOLD_SOFT = '#FBF3DE', GOLD_LINE = '#E8D9A8';
const HELV = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const SO_BAR = '#1D4E89', PO_BAR = '#8A1F3D', GP_BAR = GOLD;
// GOLD_SOFT/GOLD_LINE/PO_BAR are also exported — BookingTable (moved to
// modules/approvals/bookingApprovals.jsx) reuses this exact theme for its
// revoked-badge and Edit PO button, since both screens edit the same booking.
export { GOLD_SOFT, GOLD_LINE, PO_BAR };
// Reversal modules (Refund / Reissue) act on an existing sale — picked from the same
// module bar as Flight/Hotel, but they open the reversal entry (ReversalEntry) instead
// of the fare grid and spawn one RF/RI voucher on approval.
const REVERSAL_CHIPS = [{ code: 'RF', name: 'Refund', icon: '↩️' }, { code: 'RI', name: 'Reissue', icon: '🔁' }];
const isReversalModule = (m) => m === 'RF' || m === 'RI';
// Voucher module code → the module name used by the /api/markup-rules master
// (the rule sheet stores 'Flight'/'Hotel'/…/'Misc' or 'ALL').
const MARKUP_RULE_MODULE = { SF: 'Flight', SH: 'Holiday', SHT: 'Hotel', SV: 'Visa', SI: 'Insurance', SC: 'Car', SM: 'Misc' };
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
// Tiny helper lines under the GST-mode dropdowns (auto-derived vs missing-state).
const hintOk = { margin: '4px 0 0', fontSize: 10.5, fontWeight: 700, color: '#16794c' };
const hintWarn = { margin: '4px 0 0', fontSize: 10.5, fontWeight: 700, color: '#a9690a' };
// Neutral (grey) informational line — for a state that's expected/optional, not a
// data gap. B2C walk-ins are structurally never in the Customer Master (the pooled
// per-staff ledger is the voucher party, the passenger is only Bill-To), so the
// "not in master" note must inform, not alarm — Intra is the correct B2C default.
const hintMuted = { margin: '4px 0 0', fontSize: 10.5, fontWeight: 700, color: '#5b616e' };
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

// Rebuild the INB entry grid from a reconstructed deal (getDeal → { fareLines:[{amt,
// desc}], serviceFee, purchaseHeads, purchase, passenger }). Each fare component maps to
// its fare column by label; the service fee is the seller's margin (the ssvc column). ONE
// row reproduces both legs — the fares pass through to the sale AND are the airline cost.
// GST recomputes on save.
export function inbRowsFromDeal(spec, deal) {
  const line = blankLine(spec);
  const cols = spec.fareCols || [];
  for (const f of (deal.fareLines || [])) {
    const col = cols.find((c) => String(c.label).trim().toLowerCase() === String(f.desc).trim().toLowerCase());
    if (col) line[col.key] = num(f.amt);
  }
  line.ssvc = num(deal.serviceFee);
  // PURCHASE side: the fares mirror the sale (set above), but the Supplier Service
  // Charge ('Supp SVCHG') exists ONLY on the purchase leg's heads, and the supplier
  // incentive rides on deal.purchase — neither is in fareLines. Without restoring them
  // the Edit grid opened with psvc/incentive BLANK, so the user's saved figures looked
  // lost and the next save silently dropped them from the rebuilt purchase voucher.
  for (const h of (deal.purchaseHeads || [])) {
    if (/^supp\s*svchg$/i.test(String(h.desc || '').trim())) line.psvc = round2(num(line.psvc) + num(h.amt));
  }
  if (deal.purchase) {
    if (num(deal.purchase.incentiveAmt)) line.incentive = num(deal.purchase.incentiveAmt);
    // Holiday package: the supplier's GST is a manual entry (psvcGst), carried on the
    // purchase leg as its taxAmt — restore it so the pkg grid doesn't recompute it as 0.
    if (spec && spec.model === 'package' && num(deal.purchase.gst)) line.psvcGst = num(deal.purchase.gst);
  }
  const parts = String(deal.passenger || '').trim().split(/\s+/);
  if (parts[0]) { line.fn = parts[0]; line.sn = parts.slice(1).join(' '); }
  return [line];
}

// ── N-PO (Phase 2): additional purchase legs under one booking/Link No ────────
// Flight (SF) may add ONE Misc PO; Holiday (SH) may add legs of ANY module type;
// Visa (SV) may add another Visa (multi-country), Misc (courier/VFS) or Insurance.
// Each leg carries its own module/supplier/cost-centre/ref/cost grid → its own
// Purchase voucher on approval; the sale stays single. blank leg → dropped on save.
export const ALLOWED_LEG_MODULES = { SF: ['SM'], SH: ['SF', 'SHT', 'SC', 'SV', 'SI', 'SM'], SV: ['SV', 'SM', 'SI'] };
const newLeg = (module) => ({ module, supplier: { name: '', ledgerGroup: '' }, costCenter: '', purTallyRef: '', gstMode: 'intra', packageType: '', availItc: false, line: blankLine(VSPECS[module] || VSPECS.SM) });
// An INB deal's extra legs come back from getDeal as component `heads` (read off the
// "<pfx>-<component> [IB-Pur]" ledgers) rather than a stored grid `rows` — a booking leg has
// `rows`, an INB leg does not. Map heads onto the grid the same way inbRowsFromDeal does for
// the primary leg, else the editor opens the leg BLANK and the next save rebuilds the deal
// without its cost. 'Supp SVCHG' is a psvc column, not a fare column.
// Returns { line, unmapped } — `unmapped` lists any component this spec has no column for.
// Amounts ACCUMULATE (never assign): a leg can carry two lines on one component and the server's
// own mirror sums them ("same col twice → sum"), so assigning kept only the last and silently ate
// the rest. An UNMAPPED component is reported, not swallowed: migrated legs carry descs that
// drifted from the spec labels ('K3-Taxes', 'Supplier Service', 'Room / Basic', 'Visa Fee',
// 'Premium' all exist live), and since the save re-sends `purchases`, quietly dropping one would
// rebuild the leg WITHOUT that cost. The caller marks such a leg keep-untouched instead.
const legLineFromHeads = (sp, leg) => {
  const line = blankLine(sp);
  const cols = sp.fareCols || [];
  const unmapped = [];
  for (const h of (leg.heads || [])) {
    const desc = String(h.desc || '').trim();
    if (!desc) continue;
    if (/^supp\s*svchg$/i.test(desc)) { line.psvc = round2(num(line.psvc) + num(h.amt)); continue; }
    const col = cols.find((c) => String(c.label).trim().toLowerCase() === desc.toLowerCase());
    if (col) line[col.key] = round2(num(line[col.key]) + num(h.amt));
    else if (num(h.amt)) unmapped.push(desc);
  }
  if (leg.purchase) {
    if (num(leg.purchase.incentiveAmt)) line.incentive = num(leg.purchase.incentiveAmt);
    if (sp && sp.model === 'package' && num(leg.purchase.gst)) line.psvcGst = num(leg.purchase.gst);
  }
  return { line, unmapped };
};
export const legsFromEdit = (booking) => (booking.purchases || []).map((leg) => {
  const sp = VSPECS[leg.module] || VSPECS.SM;
  const fromHeads = (!(Array.isArray(leg.rows) && leg.rows[0]) && (leg.heads || []).length) ? legLineFromHeads(sp, leg) : null;
  return {
    // `vno` identifies an EXISTING leg so the server patches it in place (keeping its number and
    // Tally ref) instead of recreating it. Absent ⇒ a newly added leg.
    vno: leg.vno || '',
    module: leg.module, supplier: { name: leg.supplier?.ledgerName || leg.supplier?.name || '', ledgerGroup: leg.supplier?.ledgerGroup || '' },
    costCenter: leg.costCenter || '', purTallyRef: leg.purTallyRef || '', gstMode: leg.gstMode || 'intra',
    packageType: leg.packageType || '', availItc: !!leg.availItc,
    // Components this spec can't represent (a migrated leg's drifted desc). The grid cannot show
    // them, so the leg is sent back keep-untouched rather than rebuilt from a lossy read.
    unmapped: (fromHeads && fromHeads.unmapped) || [],
    line: (Array.isArray(leg.rows) && leg.rows[0])
      ? { ...blankLine(sp), ...leg.rows[0] }
      : (fromHeads ? fromHeads.line : blankLine(sp)),
  };
});
export function legToPayload(leg, brCode, noVat, foreign = false) {
  const spec = VSPECS[leg.module] || VSPECS.SM;
  const { po } = bookingTotals(spec, [leg.line], { branch: brCode, noVat, availItc: leg.availItc, packageType: leg.packageType, foreignSupplier: foreign, vatRate: (bc({ code: brCode }) || {}).vatRate });
  return {
    // `vno` lets the INB server match an EXISTING leg and patch it in place (preserving its number
    // + Tally ref) rather than recreate it. `keep` says "this leg holds a component the grid can't
    // represent — leave it exactly as it is", so a lossy read can never rewrite it to a smaller leg.
    ...(leg.vno ? { vno: leg.vno } : {}),
    ...((leg.unmapped || []).length ? { keep: true } : {}),
    module: leg.module,
    supplier: { name: leg.supplier.name, ledgerName: leg.supplier.name, ledgerGroup: leg.supplier.ledgerGroup },
    costCenter: leg.costCenter, purTallyRef: leg.purTallyRef, gstMode: leg.gstMode,
    packageType: leg.packageType, availItc: leg.availItc, po: { ...po, gstMode: leg.gstMode }, rows: [leg.line],
  };
}

// A leg actually carries money. Keyed off the LEG's OWN module spec (fareSum sums that spec's
// fare columns) — never a hardcoded `base`, which silently skipped any leg whose cost sits in a
// different column. Misc is [Base Fare, Taxes], so a TAX-ONLY leg (e.g. a seat-booking charge
// with base 0) read as empty: it was dropped from the GP fold AND from the save payload. On an
// INB edit that is data LOSS — the payload always carries `purchases` now, so a leg filtered out
// here is deleted server-side. Shared by the GP fold and both save paths so the three can never
// drift (the GP fold's comment explicitly relies on mirroring the save-time filter).
export const legFilled = (leg) => {
  // A leg whose cost sits in a component the grid can't represent reads as EMPTY on every column —
  // dropping it here would hand the server a list without it, and the server retires whatever it
  // isn't sent. It demonstrably holds money, so it always counts (and rides back keep-untouched).
  if ((leg.unmapped || []).length) return true;
  const sp = VSPECS[leg.module] || VSPECS.SM;
  // Non-ZERO, not positive: every other stage is deliberately sign-agnostic (the payload builder
  // keeps `amt !== 0`, getDeal keeps `amt !== 0`), so demanding > 0 here made this the odd one out
  // — a credit/adjustment leg, or one whose columns net to zero (+500 / −500), read as empty and
  // was dropped from the payload, which retires it server-side.
  return (sp.fareCols || []).some((c) => num(leg.line[c.key]) !== 0) || num(leg.line.psvc) !== 0;
};

function ExtraPurchases({ parentModule, branch, brCode, noVat, legs, onChange, isForeign, supplyOf }) {
  const allowed = ALLOWED_LEG_MODULES[parentModule];
  if (!allowed) return null;
  const setLeg = (i, patch) => onChange(legs.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const setLine = (i, key, val) => setLeg(i, { line: { ...legs[i].line, [key]: val } });
  // Re-picking the module reseeds the grid line, but MUST carry the leg's identity: `vno` (an
  // existing leg — without it the server can't match and would mint a new number and retire the
  // original) and `unmapped` (its keep-untouched marker — without it the reseeded blank line reads
  // as empty and the leg is dropped from the payload entirely, i.e. retired). newLeg() has
  // neither, so spreading it first silently discarded both.
  const setModule = (i, m) => onChange(legs.map((l, idx) => (idx === i
    ? { ...newLeg(m), vno: l.vno, unmapped: l.unmapped, supplier: l.supplier, costCenter: l.costCenter, purTallyRef: l.purTallyRef }
    : l)));
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
        // This leg carries a component the grid has no column for (a migrated leg whose desc
        // drifted from the spec labels). It is saved back UNTOUCHED, so editing it here would be
        // silently discarded — say so and lock it, rather than accept keystrokes that go nowhere.
        const locked = (leg.unmapped || []).length > 0;
        return (
          <div key={i} style={{ padding: 11, marginBottom: 10, background: locked ? '#f6f7f9' : '#fffdf7', border: `1px solid ${locked ? '#cdd1d8' : '#eee3cf'}`, borderRadius: 7 }}>
            {locked && (
              <div role="status" style={{ marginBottom: 8, padding: '6px 9px', borderRadius: 5, background: '#fff7e0', border: '1px solid #eee3cf', fontSize: 11, color: '#8a6d00' }}>
                🔒 Read-only — this leg holds {leg.unmapped.map((u) => `“${u}”`).join(', ')}, which this grid has no column for.
                It is kept exactly as it is on save. To change it, revoke the deal and re-raise the leg.
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
              <strong style={{ fontSize: 12 }}>PO #{i + 1}</strong>
              <select value={leg.module} onChange={(e) => setModule(i, e.target.value)} disabled={locked} style={{ ...cell, width: 'auto', ...(locked ? { background: '#eef1f5', color: '#9197a3', cursor: 'not-allowed' } : {}) }}>
                {allowed.map((m) => <option key={m} value={m}>{VSPECS[m].name}</option>)}
              </select>
              <div style={{ minWidth: 220 }}>
                <PartyPicker branch={branch} kind="supplier" value={{ name: leg.supplier.name, group: leg.supplier.ledgerGroup }}
                  onChange={(v) => {
                    // The leg supplier's master state auto-picks THIS leg's GST mode
                    // (still overridable via the select); foreign → mode is moot (0 GST).
                    const auto = supplyOf ? supplyOf(v.name) : '';
                    setLeg(i, { supplier: { name: v.name, ledgerGroup: v.group }, ...(auto === 'intra' || auto === 'inter' ? { gstMode: auto } : {}) });
                  }} />
              </div>
              <input value={leg.costCenter} onChange={(e) => setLeg(i, { costCenter: e.target.value.toUpperCase() })} placeholder="Cost Centre" style={{ ...cell, width: 120 }} />
              <input value={leg.purTallyRef} onChange={(e) => setLeg(i, { purTallyRef: e.target.value })} placeholder="Supplier Inv. No (Tally ref)" style={{ ...cell, width: 170 }} />
              {/* VAT has no intra/inter split — hidden on Africa branches. */}
              {!isVatBranch(brCode) && (isForeign && isForeign(leg.supplier.name)
                ? <span title="Overseas supplier — no Indian GST (import of service)" style={{ ...cell, width: 'auto', background: '#eef0f4', color: '#5b616e', fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>🌐 No GST — overseas</span>
                : <select value={leg.gstMode} onChange={(e) => setLeg(i, { gstMode: e.target.value })} style={{ ...cell, width: 'auto' }}><option value="intra">Intra (CGST+SGST)</option><option value="inter">Inter (IGST)</option></select>)}
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
    // Editing an INB deal → rebuild the single fare row from the reconstructed deal
    // (fares + service fee), so both legs load into the SAME unified grid as SO/PO/GP.
    if (editing && interBranch && editBooking.isInterBranch) return inbRowsFromDeal(spec, editBooking);
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
    ? { name: editBooking.supplier?.name || '', gstin: editBooking.supplier?.gstin || '', address: editBooking.supplier?.address || '', email: editBooking.supplier?.email || '', contact: editBooking.supplier?.contact || '', ledgerName: editBooking.supplier?.ledgerName || '', ledgerGroup: editBooking.supplier?.ledgerGroup || '' }
    : { name: '', gstin: '', address: '', email: '', contact: '', ledgerName: '', ledgerGroup: '' });

  const [clientType, setClientType] = useState(editing ? (editBooking.customer?.ledgerGroup || '') : '');
  const reg = useLedgerRegistry(branch).data || [];
  // Party-master resolvers (mirror the backend's countryFromSupplierMaster): match the
  // chosen ledger / typed name to its master row by exact name. The SUPPLIER's record
  // drives the purchase leg — a foreign vendor (e.g. IATA-BSP / Singapore) can't withhold
  // Indian 194H TDS AND charges no Indian GST (import of service), so both are dropped
  // from the grid; an Indian vendor's STATE vs the branch's home state auto-picks the
  // Purchase GST mode. The CUSTOMER's record does the same for the Sale GST mode.
  const supplierMaster = useQuery({ queryKey: ['suppliers'], queryFn: () => apiGet('/api/suppliers') }).data || [];
  const supplierByName = useMemo(() => {
    const m = new Map();
    (supplierMaster || []).forEach((s) => { if (s && s.name) m.set(s.name.trim().toLowerCase(), s); });
    return m;
  }, [supplierMaster]);
  const supplierOf = (name) => supplierByName.get(String(name || '').trim().toLowerCase()) || null;
  const countryOfSupplier = (name) => (supplierOf(name) || {}).country || '';
  const isForeignSupplier = (name) => !isIndiaCountry(countryOfSupplier(name));
  const suppForeign = isForeignSupplier(supplier.name);
  const supplySupplierOf = (name) => { const r = supplierOf(name); return r ? supplyTypeOf(r, brCode) : ''; };
  // Customer master (ERP-owned + transaction-derived rows). B2C end-customers are looked
  // up here by NAME — the pooled per-staff B2C ledger carries no state, the customer
  // record does (address + state are compulsory on creation).
  const customerMaster = useQuery({ queryKey: ['customers'], queryFn: () => apiGet('/api/customers') }).data || [];
  const customerByName = useMemo(() => {
    const m = new Map();
    (customerMaster || []).forEach((c) => { if (c && c.name) m.set(c.name.trim().toLowerCase(), c); });
    return m;
  }, [customerMaster]);
  const customerOf = (name) => customerByName.get(String(name || '').trim().toLowerCase()) || null;
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
  const handleToBranchChange = (tb) => {
    setToBranch(tb);
    // No setSaleGstMode here: this handler is wired ONLY to the To Branch dropdown, which renders
    // only in interBranch mode — and an INB deal's sale mode is the server's (inbTaxTreatment),
    // never read off saleGstMode. Setting it was writing a value nothing on this path reads.
    if (tb) { setCustomer((c) => ({ ...c, name: `Travkings Tours and Travels ${tb}`, ledgerName: `Travkings Tours and Travels ${tb}`, ledgerGroup: 'Sundry Debtors', group: 'Sundry Debtors' })); }
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
  // INB deals carry the purchase leg's mode on editBooking.purchase (getDeal shape).
  const [purGstMode, setPurGstMode] = useState(editing ? (editBooking.po?.gstMode || editBooking.purchase?.gstMode || editBooking.gstMode || 'intra') : 'intra');
  // ── Auto GST mode from the party masters ────────────────────────────────────
  // Sale leg ← the CUSTOMER's state · Purchase leg ← the SUPPLIER's state, each vs
  // the branch's home state (BOM=Maharashtra, AMD=Gujarat). Fires only when the user
  // picks/types a DIFFERENT party than the one the form loaded with (an edit keeps
  // its stored mode), and the dropdowns stay manually overridable. A foreign
  // supplier needs no mode at all — its purchase leg carries zero GST.
  const custRec = customerOf(customer.name);
  const custSupply = custRec ? supplyTypeOf(custRec, brCode) : '';
  const suppRec = supplierOf(supplier.name);
  const suppSupply = suppForeign ? 'foreign' : (suppRec ? supplyTypeOf(suppRec, brCode) : '');
  const normName = (s) => String(s || '').trim().toLowerCase();
  const lastCustApplied = useRef(normName(editing ? editBooking.customer?.name : ''));
  const lastSuppApplied = useRef(normName(editing ? (editBooking.supplier?.ledgerName || editBooking.supplier?.name) : ''));
  useEffect(() => {
    if (interBranch) return; // INB fixes its own modes (seller IGST / buyer via fetchInb)
    const key = normName(customer.name);
    if (!key || key === lastCustApplied.current) return;
    if (custSupply === 'intra' || custSupply === 'inter') { setSaleGstMode(custSupply); lastCustApplied.current = key; }
  }, [customer.name, custSupply, interBranch]); // eslint-disable-line react-hooks/exhaustive-deps
  // The PURCHASE leg auto-derives on INB too. The sale-side bail-out above is right — an INB deal's
  // sale tax is the server's to decide (inbTaxTreatment) — but the purchase leg is an ORDINARY
  // supplier invoice: the airline has a real state and place-of-supply works exactly as it does on a
  // customer booking. Bailing here left every INB purchase on the 'intra' default, so an out-of-state
  // airline's input tax silently booked as CGST+SGST instead of one IGST Input leg — the same
  // misfiling the deal-edit patch was fixed to stop persisting.
  useEffect(() => {
    const key = normName(supplier.name);
    if (!key || key === lastSuppApplied.current) return;
    if (suppSupply === 'intra' || suppSupply === 'inter') { setPurGstMode(suppSupply); lastSuppApplied.current = key; }
  }, [supplier.name, suppSupply]); // eslint-disable-line react-hooks/exhaustive-deps
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
  const updateInb = useUpdateInb(); // edit BOTH pending legs of an existing INB deal as a unit
  // Editing an INB deal preloads its counterparty branch; a fresh INB voucher starts empty.
  const [toBranch, setToBranch] = useState(editing && interBranch && editBooking.isInterBranch ? (editBooking.toBranch || '') : '');
  const inbBranches = INB_ALL.filter((b) => b !== brCode);
  // Whether a cross-border INB leg is zero-rated is now the SELLER'S CHOICE (the "Bill IGST/VAT"
  // tick below), not a hardcoded BOM carve-out — see `billIgst`. The banner reads that flag so it
  // can never contradict the tick. A same-country INB leg is always taxable.
  // ── Inter-branch cross-currency FX (manual, per deal — no daily rate) ─────────
  // India branches book ₹, Africa branches book $. When the two ends differ the deal is
  // CROSS-CURRENCY: the seller keys ONE frozen rate (1 USD = ₹x) on this INSO voucher; the
  // buyer branch's converted INPO is derived from it on push. Same-currency deals never
  // see the field. The rate is frozen onto the deal on save (fx on the INB payload).
  // The group's STANDARD internal inter-branch rate. It is a DEFAULT, not a market rate: a new
  // deal is PREFILLED with it (so the standard is what normally gets frozen — the field used to
  // open blank and merely hint a number, so every deal carried a hand-typed one) but stays
  // EDITABLE, because a one-off deal may legitimately be raised at its own rate. Whatever is
  // shown here is what the deal freezes — each voucher keeps its own immutable copy.
  // Off-standard rates are SAFE for reconciliation: inter-branch recon translates each pair at
  // the rate its own deals froze (interbranch.service ratesOf), never at an assumed standard.
  // An EXISTING deal shows its OWN frozen historic rate — never silently re-rated to today's.
  const INB_INTERNAL_RATE = 95;   // ← KEEP IN STEP with taxRegime.INB_INTERNAL_RATE (backend default)
  const [fxRate, setFxRate] = useState(editing && editBooking.fx && editBooking.fx.rate ? String(editBooking.fx.rate) : String(INB_INTERNAL_RATE));
  const inbCcyOf = (code) => (((bc({ code }) || {}).cur) === '$' ? 'USD' : 'INR');
  const sellerCcy = inbCcyOf(brCode);
  const buyerCcy = interBranch && toBranch ? inbCcyOf(toBranch) : sellerCcy;
  const crossCcy = interBranch && !!toBranch && sellerCcy !== buyerCcy;
  const fxRateNum = num(fxRate);
  // Manual IGST tick — bill tax on the Service Fee even cross-border. A same-country inter-state
  // deal is always taxable (tick locked ON); a cross-border deal defaults OFF (zero-rated export)
  // and the seller ticks it to bill IGST (added to what the buyer branch pays).
  const crossBorderInb = interBranch && !!toBranch && inbCrossBorder(brCode, toBranch);
  // EVERY India seller (BOM/AMD/BOMMB) bills IGST on its Service Fee even cross-border to Africa
  // (seller-side reconciliation rule), so the tick DEFAULTS ON for all of them; an Africa seller
  // defaults to a zero-rated export (OFF). It stays a per-deal CHOICE — a genuine zero-rated export
  // can still be booked by unticking. Was `brCode === 'BOM'`, which opened the tick OFF on an
  // otherwise identical AMD→FBM / BOMMB→FBM deal and shipped it zero-rated unless someone noticed.
  // Edit preloads the saved choice. Mirrors the backend fallback (inbTaxTreatment) exactly.
  const [billIgstCB, setBillIgstCB] = useState(editing ? !!(editBooking.billIgst) : inbIndiaSeller(brCode));
  const billIgst = interBranch ? (crossBorderInb ? billIgstCB : true) : undefined;

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
  // A zero-rated inter-branch EXPORT bills no tax on the Service Fee — the banner says so and the
  // server posts taxAmt 0 (inbTaxTreatment: cross-border + tick off ⇒ rate 0, for ANY seller).
  // `billIgst === false` is exactly that case: a same-country INB pins it true, a non-INB voucher
  // leaves it undefined. It rides its OWN sale-side flag rather than the Africa Without-VAT
  // toggle, because that toggle is `isVatBr`-gated: folding it in there fixed FBM/NBO/DAR but left
  // AMD/BOMMB (which default the tick OFF) showing 18% under a "zero-rated" banner — and simply
  // dropping the isVatBr gate would zero India's purchase GST/ITC via purRateOf. saleZeroRated
  // touches the sale side only, so input tax keeps following the supplier's invoice either way.
  const inbZeroRated = interBranch && billIgst === false;
  const effNoVat = isVatBr && noVat;
  // Live VAT % from the branch config / VAT master (null → voucherSpecs static fallback),
  // so a Super-Admin rate amendment flows into the on-screen math and the saved booking.
  const liveVatRate = (bc({ code: brCode }) || {}).vatRate;
  const totals = useMemo(() => bookingTotals(spec, lines, { packageType, noSupplier: isNoSupp, branch: brCode, noVat: effNoVat, saleZeroRated: inbZeroRated, foreignSupplier: suppForeign, clientType, date, vatRate: liveVatRate }), [spec, lines, packageType, isNoSupp, brCode, effNoVat, inbZeroRated, suppForeign, clientType, date, liveVatRate]);
  // Effective TCS 206C(1G) rate for this booking's date (5% up to 31-03-2026, else 2%).
  const tcsRate = spec.tcs ? tcs206cRate(spec, date) : 0;
  const hasPackage = moduleCode === 'SF' || moduleCode === 'SH';
  // The SALE-side rate — drives the "{taxLabel}/Service Fee ({activeRate}%)" captions. Mirrors
  // svcRateOf: zero when the fee isn't billed, whether that's the Africa Without-VAT toggle or a
  // zero-rated inter-branch export (which applies to an India seller too).
  const getGstRate = () => {
    if (effNoVat || inbZeroRated) return 0;
    if (isVatBr) {
      return liveVatRate != null ? liveVatRate : (brCode === 'NBO' ? 16 : brCode === 'DAR' ? 18 : brCode === 'FBM' ? 16 : 18);
    }
    if (spec.model === 'package') return spec.gstRate ? spec.gstRate * 100 : 5;
    return spec.tax && spec.tax.rate != null ? spec.tax.rate : 18;
  };
  const activeRate = getGstRate();

  // N-PO: fold the ADDITIONAL purchase legs into the headline Gross Profit so the entry
  // screen shows the same folder GP the booking saves with (backend gpForMulti), not the
  // primary-PO-only figure. Mirrors backend purchaseNetOf (total − roundOff − GST − TCS −
  // incentive) and the save-time leg filter. The per-passenger table below stays PRIMARY.
  const extraLegsFilled = (isNoSupp ? [] : extraPOs).filter(legFilled);
  const extraLegNet = extraLegsFilled.reduce((s, leg) => {
    const po = legToPayload(leg, brCode, effNoVat, isForeignSupplier(leg.supplier.name)).po;
    return s + (num(po.total) - num(po.roundOff) - num(po.gst) - num(po.tcs) - num(po.incentiveAmt));
  }, 0);
  const hasExtraLegs = Math.abs(extraLegNet) > 0.005;
  const folderGpTotal = Math.round((num(totals.gp.total) - extraLegNet) * 100) / 100;
  const folderGpPct = num(totals.so.total) > 0 ? Math.round((folderGpTotal / num(totals.so.total)) * 10000) / 100 : 0;

  // ── Markup-rule default (Masters ▸ Service Charge - 2 / Rate Sheet) ─────────
  // The ACTIVE Percentage rule for this module (an exact module rule beats an
  // 'ALL' rule) seeds each line's Service Charge - 2 as the fares are entered:
  // while the line's markup is blank or still exactly the rule-derived figure,
  // editing a fare cell re-derives it as rule% × fare sum. Typing your own figure
  // breaks the link for that line — the rule is a DEFAULT, never a lock. New
  // vouchers only (editing keeps the saved figures); INB has no markup column.
  const markupRules = useMasterList('markup-rules', { active: true }).data || [];
  const markupRule = useMemo(() => {
    const mod = String(MARKUP_RULE_MODULE[moduleCode] || '').toLowerCase();
    const pool = markupRules.filter((r) => r && r.active !== false && r.markupType === 'Percentage' && num(r.value) > 0);
    return pool.find((r) => String(r.module || '').toLowerCase() === mod)
      || pool.find((r) => String(r.module || '').toUpperCase() === 'ALL')
      || null;
  }, [markupRules, moduleCode]);
  const fareKeySet = useMemo(() => new Set((spec.fareCols || []).map((c) => c.key)), [spec]);
  const ruleMarkupFor = (l) => round2(fareSum(spec, l) * num(markupRule && markupRule.value) / 100);

  const setLine = (i, key, val, numeric) =>
    setLines(lines.map((l, idx) => {
      if (idx !== i) return l;
      const next = { ...l, [key]: numeric ? (val === '' ? '' : Number(val)) : val };
      // Markup-rule default: a fare edit re-derives an untouched markup (see above).
      if (!editing && !interBranch && markupRule && fareKeySet.has(key)
          && (l.markup === '' || num(l.markup) === ruleMarkupFor(l))) {
        next.markup = ruleMarkupFor(next) || '';
      }
      return next;
    }));
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
  // Inter-branch guard is DIRECTION-specific (mirrors the backend). Only the SELLER side —
  // a "Travkings Tours and Travels <branch>" CUSTOMER (selling to another branch) — belongs
  // on the INB Voucher, so block the save there. The BUYER side (a Travkings inter-branch
  // SUPPLIER — buying from another branch, e.g. completing the auto-seeded buyer booking of a
  // pushed INB deal) is a normal-creditor SO/PO/GP purchase → allowed. (interBranch=true means
  // this component IS the INB Voucher, so the check is skipped entirely.)
  const IB_NAME = /travkings\s+tours\s+and\s+travels/i;
  const IB_GROUP = /inter.?branch/i;
  const interBranchParty = !interBranch && (
    IB_NAME.test(customer.name || '') || IB_NAME.test(customer.ledgerName || '')
    || IB_GROUP.test(customer.ledgerGroup || '') || IB_GROUP.test(customer.group || ''));
  // A Flight/Holiday deal MUST declare International vs Domestic — that choice IS the cost
  // centre. Blocked on BOTH paths so a blank one can't post into "Unspecified": the customer
  // path is caught by the approval gate, the inter-branch (INB) path had no such gate, so we
  // require it here at entry (the INB deal posts on approval with no second Int'l/Dom prompt).
  const needsScope = hasPackage && !packageType;
  // No-supplier needs only a sale + a customer; otherwise a supplier + cost are required.
  const canSave = interBranch
    ? (!!brCode && !saving && !!toBranch && totals.so.total > 0 && !needsScope && (!crossCcy || fxRateNum > 0))  // INB: counterparty + sale value + Int'l/Domestic for Flights/Holiday + FX rate on a cross-currency deal
    : (!!brCode && !saving && !interBranchParty && totals.so.total > 0 && customer.name.trim() && hasCustLedger
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
      const inbBody = {
        fromBranch: brCode, toBranch, date, module: moduleCode,
        packageType: hasPackage ? packageType : '', passenger: pax, reference: saleTallyRef || headerRef,
        fareLines, serviceFee, billIgst,
        noSupplier: isNoSupp,
        supplier: hasPurchase ? { name: supplier.name, ledgerName: supplier.ledgerName || supplier.name, ledgerGroup: supplier.ledgerGroup, country: countryOfSupplier(supplier.name), foreign: suppForeign } : null,
        purchase: hasPurchase ? { heads: totals.po.heads || [], gst: totals.po.gst || 0, incentiveAmt: totals.po.incentiveAmt || 0, incentiveTds: totals.po.incentiveTds || 0, gstMode: purGstMode } : null,
        // N-PO: the ADDITIONAL supplier cost legs under this same Link No (a Flight may add a
        // Misc cost leg; a Holiday any component). Same shape + filter as the SO/PO/GP payload.
        // These were silently DROPPED before — the key was absent, so the server never posted
        // the extra legs on create, and on edit it left the old ones untouched (invisible in the
        // editor). Sent unconditionally now, which is safe ONLY because legsFromEdit above
        // rehydrates the deal's existing legs — otherwise an edit would post [] and delete them.
        purchases: (isNoSupp ? [] : extraPOs)
          .filter(legFilled)
          .map((leg) => legToPayload(leg, brCode, effNoVat, isForeignSupplier(leg.supplier.name))),
        // Freeze the deal's FX quote (base USD, quote INR) so the buyer branch's converted INPO is
        // derived from exactly the rate shown on screen; omitted for same-currency deals, where the
        // backend needs none. The field is prefilled with the group's standard rate, so this is
        // normally that — but a one-off deal may carry its own, and each voucher keeps an immutable
        // copy. That is SAFE for reconciliation now: a pair is translated at the rate its own deals
        // froze (interbranch.service ratesOf), so an off-standard deal reconciles at its own rate
        // instead of being compared against an assumed standard it never used.
        ...(crossCcy && fxRateNum > 0
          ? { fx: { base: 'USD', quote: 'INR', rate: fxRateNum, date, fromCcy: sellerCcy, toCcy: buyerCcy, source: 'manual' } }
          : {}),
      };
      // Editing an existing INB deal → rebuild BOTH pending legs as a unit (reason to the
      // audit trail); a fresh voucher raises a new deal. Same body either way.
      if (editing) {
        const { confirmed, reason } = await confirmDialog({ title: 'Save changes to this INB deal?', message: 'Both legs are rebuilt from the entry and stay Pending for re-approval.', reasonRequired: true, reasonLabel: 'Reason for editing (saved to the audit trail)', confirmLabel: 'Save changes' });
        if (!confirmed) return;
        setError(''); setSaving(true);
        updateInb.mutate({ linkNo: editBooking.linkNo, ...inbBody, editReason: reason }, {
          // Changing the destination branch renumbers the deal (INB/BOM-AMD → INB/BOM-DAR),
          // so show the number the server actually minted, not the pre-edit one.
          onSuccess: (data) => { const newLink = data?.linkNo || editBooking.linkNo; setResult({ bookingNo: newLink, _approved: false, _inb: true, _edited: true }); toast(`Inter-branch deal ${newLink} saved — pending approval`); qc.invalidateQueries({ queryKey: ['inb'] }); invalidateBooks(qc); },
          onError: (e) => { setError(e.message || 'Failed to save'); toast(`Could not save — ${e.message || 'failed'}`, 'error'); },
          onSettled: () => setSaving(false),
        });
        return;
      }
      setError(''); setSaving(true);
      createInb.mutate(inbBody, {
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
        const c = lineCalc(spec, l, { branch: brCode, noVat: effNoVat, saleZeroRated: inbZeroRated });
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
        purchases: (isNoSupp ? [] : extraPOs).filter(legFilled).map((leg) => legToPayload(leg, brCode, effNoVat, isForeignSupplier(leg.supplier.name))),
      };
      const booking = editing
        ? await apiPut('/api/booking-orders/' + editBooking.id, payload)
        : await apiPost('/api/booking-orders', payload);
      qc.invalidateQueries({ queryKey: ['booking-orders'] });
      if (editing) invalidateBooks(qc); // an edit reverses the prior posting → refresh every books cache
      toast(`Voucher ${booking.bookingNo || ''} saved — pending approval`);
      // If this PO was fetched from an open inter-branch leg, consume it (mark the
      // INB link booked). Non-fatal: a miss leaves the link open to retry.
      if (inbId && booking?.bookingNo) {
        try { await bookInb.mutateAsync({ id: inbId, purchaseVno: booking.bookingNo }); setInbLinkNo(''); setInbId(''); }
        catch (_) { /* link stays open; surfaced in the INB reconciliation */ }
      }
      setResult({ ...booking, _approved: false, _edited: editing });
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

  // The Purchase Order section — step ② of the full entry form.
  const poSection = !isNoSupp && (
    <Section n="2" badge={interBranch ? 'INPO' : 'PO'} name={interBranch ? 'Inter-Branch Purchase Order' : 'Purchase Order'} sub={`what you pay the airline / supplier · supplier incentive is automatically subtracted${suppForeign ? ' · foreign supplier — no Indian TDS' : ', 2% TDS is added'}`} accent={PO_BAR}>
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
              const c = lineCalc(spec, l, { branch: brCode, noVat: effNoVat, saleZeroRated: inbZeroRated, foreignSupplier: suppForeign });
              return (
                <React.Fragment key={i}>
                <tr className="transition hover:bg-[#fdf7f9]">
                  <td style={{ ...tdC, textAlign: 'left', padding: '6px 3px', width: 140, ...(spec.sectors ? { borderBottom: 'none' } : {}) }}><input value={l.fn ?? ''} onChange={(e) => setLine(i, 'fn', e.target.value)} placeholder={spec.idCols[0].label} style={cellTxt} /></td>
                  <td style={{ ...tdC, textAlign: 'left', padding: '6px 3px', width: 140, ...(spec.sectors ? { borderBottom: 'none' } : {}) }}><input value={l.sn ?? ''} onChange={(e) => setLine(i, 'sn', e.target.value)} placeholder={spec.idCols[1].label} style={cellTxt} /></td>
                  {refKeys.map((col) => <td key={col.key} style={{ ...tdAuto, textAlign: 'left', fontWeight: 700, color: col.kind === 'pnr' ? GOLD : '#3A3A3A', width: 120, ...(spec.sectors ? { borderBottom: 'none' } : {}) }}>{l[col.key] || '—'}</td>)}
                  {spec.fareCols.map((col) => (
                    <td key={col.key} style={{ padding: '6px 3px', width: 60, ...(spec.sectors ? { borderBottom: 'none' } : {}) }}>
                      <input type="number" min="0" value={l[col.key] ?? ''} placeholder="0" onChange={(e) => setLine(i, col.key, e.target.value, true)} style={cellInp} />
                    </td>
                  ))}
                  <td style={{ padding: '6px 3px', width: 95, ...(spec.sectors ? { borderBottom: 'none' } : {}) }}>
                    <input type="number" min="0" value={l.psvc ?? ''} placeholder="0" onChange={(e) => setLine(i, 'psvc', e.target.value, true)} style={cellInp} />
                  </td>
                  {pkg
                    ? <td style={{ padding: '6px 3px', width: 95, ...(spec.sectors ? { borderBottom: 'none' } : {}) }}>
                        {suppForeign
                          ? <span title="Overseas supplier — no Indian GST (import of service)" style={{ display: 'block', padding: '6px 8px', fontSize: 12, textAlign: 'right', color: '#9197a3', fontWeight: 700 }}>—</span>
                          : <input type="number" min="0" value={l.psvcGst ?? ''} placeholder="0" onChange={(e) => setLine(i, 'psvcGst', e.target.value, true)} style={cellInp} />}
                      </td>
                    : <td style={{ ...tdAuto, width: 95, background: '#FBF3DE', color: GOLD_DEEP, ...(spec.sectors ? { borderBottom: 'none' } : {}) }}>{fmt(c.gstPur)}</td>}
                  <td style={{ padding: '6px 3px', width: 100, ...(spec.sectors ? { borderBottom: 'none' } : {}) }}>
                    <input type="number" min="0" value={l.incentive ?? ''} placeholder="0" onChange={(e) => setLine(i, 'incentive', e.target.value, true)} style={cellInp} />
                  </td>
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
            <td style={poTf}>{pkg && !suppForeign ? fmt(lines.reduce((s, l) => s + num(l.psvcGst), 0)) : fmt(totals.po.gst)}</td>
            <td style={poTf}>{fmt(totals.po.incentiveAmt)}</td>
            <td style={poTf}>{fmt(totals.po.incentiveTds)}</td>
            <td style={{ ...poTf, color: CR }}>{fmt(totals.po.total)}{num(totals.po.roundOff) ? <span style={{ display: 'block', fontSize: 9, fontWeight: 600, color: '#8a6d1e' }}>round off {totals.po.roundOff > 0 ? '+' : ''}{fmt(totals.po.roundOff)}</span> : null}</td>
          </tr></tfoot>
        </table>
      </div>
    </Section>
  );

  return (
    <div ref={formKeys.ref} onKeyDown={formKeys.onKeyDown} style={{ maxWidth: 1600, margin: '0 auto', padding: '12px 10px 90px', fontFamily: HELV, color: '#1F2328', WebkitFontSmoothing: 'antialiased' }}>
      {/* Header */}
      <div style={{ ...card, border: '1px solid #dfe2e7', borderLeft: '4px solid ' + GOLD, borderRadius: 4, padding: 0, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ padding: '14px 18px', background: DARK, borderBottom: '3px solid ' + GOLD, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: '0.5px', color: '#fff' }}>{editing ? `EDIT — ${editBooking.bookingNo}` : (interBranch ? 'INSO / INPO / INGP VOUCHER' : 'SO / PO / GP VOUCHER')}</p>
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
            {(interBranch ? ['INSO', 'INPO', 'INGP'] : ['SO', 'PO', 'GP']).map((c) => <span key={c} style={{ fontSize: 9, fontWeight: 800, padding: '3px 9px', borderRadius: 20, background: interBranch ? GOLD : GOLD_SOFT, color: interBranch ? '#fff' : GOLD_DEEP }}>{c}</span>)}
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
          branches always follow the per-module GST rule, so this is hidden there.
          HIDDEN on an inter-branch voucher too: the INB payload sends `billIgst`, never
          `noVat`, so this control changed nothing there — while still highlighting "With VAT"
          over a grid the IGST tick had already zero-rated. The tick below is the one
          and only tax control on an INB deal. */}
      {isVatBr && !interBranch && (
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
          {toBranch && <> Tax: <b>{
            !billIgst ? `Export · zero-rated (${INB_COUNTRY[brCode]}→${INB_COUNTRY[toBranch]})`
              /* VAT sellers are rated per branch (16/18/16) — never restate a flat % here. */
              : isVatBranch(brCode) ? 'VAT · inter-branch (on Service Fee)'
                : `IGST · ${inbCrossBorder(brCode, toBranch) ? 'inter-branch' : 'inter-state'} (18% on Service Fee)`
          }</b>.</>}
          {' '}Creates an INB Link No the {toBranch || 'buying'} branch fetches on its SO/PO/GP.
        </div>
      )}

      {/* Header fields */}
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 11 }}>
          <FL label="SPG Date"><SmartDateInput value={date} onChange={setDate} style={inp} /></FL>
          <FL label="Travel / Departure Date"><SmartDateInput value={travelDate} onChange={setTravelDate} style={inp} title="When the customer travels — type e.g. 20.03.2026 → 20/03/2026; drives the Upcoming Travel dashboard" /></FL>
          <FL label="Client Type">
            <DropdownMenu
              ariaLabel="Client Type"
              menuRole="listbox"
              items={[{ key: '', label: 'All Client Types', selected: clientType === '', onSelect: () => handleClientTypeChange('') },
                ...clientTypes.map((ct) => ({ key: ct, label: ct, selected: clientType === ct, onSelect: () => handleClientTypeChange(ct) }))]}
              renderTrigger={({ ref, toggle, triggerProps }) => (
                <button ref={ref} {...triggerProps} onClick={toggle} type="button"
                  style={{ ...inp, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{clientType || 'All Client Types'}</span>
                  <ChevronDown size={14} style={{ color: '#5b616e', flexShrink: 0 }} />
                </button>
              )}
            />
          </FL>
          {spec.headerLabel && spec.headerLabel !== 'Sector / Airline' && (
            <FL label={spec.headerLabel}><input value={headerRef} onChange={(e) => setHeaderRef(e.target.value)} placeholder={spec.headerLabel} style={inp} /></FL>
          )}
          {interBranch ? (
            <>
            <FL label={<>To Branch (counterparty) <span style={{ color: '#dc2626' }}>*</span></>}>
              <DropdownMenu
                ariaLabel="To Branch"
                menuRole="listbox"
                items={[{ key: '', label: 'Select branch', selected: toBranch === '', onSelect: () => handleToBranchChange('') },
                  ...inbBranches.map((b) => ({ key: b, label: b, selected: toBranch === b, onSelect: () => handleToBranchChange(b) }))]}
                renderTrigger={({ ref, toggle, triggerProps }) => (
                  <button ref={ref} {...triggerProps} onClick={toggle} type="button"
                    style={{ ...inp, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{toBranch || 'Select branch'}</span>
                    <ChevronDown size={14} style={{ color: '#5b616e', flexShrink: 0 }} />
                  </button>
                )}
              />
            </FL>
            {/* FX Rate — ALWAYS shown on the INB voucher; EDITABLE only for a cross-currency
                (different-country) deal (BOM→FBM/DAR/NBO); DISABLED for a same-currency one
                (BOM→AMD) since no translation is needed. */}
            <FL label={<>Deal FX Rate — 1 USD = ₹ {crossCcy && <span style={{ color: '#dc2626' }}>*</span>}</>}>
              {/* Prefilled with the group's STANDARD rate and editable: a one-off deal may be
                  raised at its own rate, and the deal freezes exactly what is shown here. Safe
                  for reconciliation — the pair is translated at the rate its own deals froze
                  (interbranch.service ratesOf), never at an assumed standard. */}
              <input type="number" min="0" step="0.0001" value={crossCcy ? fxRate : ''} onChange={(e) => setFxRate(e.target.value)}
                disabled={!crossCcy} placeholder={crossCcy ? '' : '—'}
                style={{ ...inp, ...(crossCcy ? {} : { background: '#eef1f5', color: '#9197a3', cursor: 'not-allowed' }) }} />
              <p style={!crossCcy ? hintMuted : (fxRateNum > 0 ? hintOk : hintWarn)}>
                {!crossCcy
                  ? (toBranch
                    ? <>Same currency — {brCode} &amp; {toBranch} both book in <b>{sellerCcy === 'INR' ? '₹ INR' : '$ USD'}</b>; no rate needed.</>
                    : <>Pick a destination — the rate activates for a cross-currency (₹ ↔ $) deal.</>)
                  : fxRateNum > 0
                    ? <>✓ {toBranch} books in {buyerCcy}: {(bc({ code: toBranch }) || {}).cur}{round2(sellerCcy === 'INR' ? num(totals.so.total) / fxRateNum : num(totals.so.total) * fxRateNum).toLocaleString()}</>
                    : <>⚠ {sellerCcy} → {buyerCcy} deal — enter the frozen rate so {toBranch} books in {buyerCcy}</>}
              </p>
            </FL>
            {crossBorderInb && (
              <FL label="IGST on Service Fee">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer', fontSize: 12.5, color: '#1F2328' }}>
                  <input type="checkbox" checked={billIgst} onChange={(e) => setBillIgstCB(e.target.checked)} />
                  <span>Bill IGST 18% even cross-border</span>
                </label>
                <p style={billIgst ? hintOk : hintMuted}>{billIgst ? `✓ Billed — added to what ${toBranch} pays` : 'Zero-rated export — no IGST on the Service Fee'}</p>
              </FL>
            )}
            </>
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
            <FL label="Customer (Bill to) *">
              <B2cCustomerPicker value={customer.name} customers={customerMaster} brCode={brCode}
                onChange={(name) => setCustomer((c) => ({ ...c, name }))}
                onPick={(rec) => setCustomer((c) => ({ ...c, name: rec.name, gstin: rec.gstin || '', address: rec.address || '', email: rec.email || '', contact: rec.phone || rec.contact || '' }))} />
            </FL>
          )}
          {/* VAT has no intra/inter (place-of-supply) split — these CGST/SGST vs IGST
              selectors are India-only and are hidden on Africa/VAT branches.
              An INB deal's SALE tax is not the user's to pick: the server derives it from the
              branch pair (inbTaxTreatment) — same-country is always inter-state IGST, and a
              cross-border deal is zero-rated unless the "Bill IGST" tick above says otherwise.
              `saleGstMode` is never read into `inbBody`, so on INB this control was decoration:
              it always opened showing "Intra-state (CGST+SGST)" (InbEditGate supplies no
              so/gstMode to seed it), and changing it moved the UI but sent nothing — the
              accountant saw CGST, switched to IGST, saved, and nothing happened. Hide it on
              INB so the Bill IGST tick is the single, honest control. */}
          {!isVatBr && !interBranch && <FL label="Sale GST mode">
            <DropdownMenu
              ariaLabel="Sale GST mode"
              menuRole="listbox"
              items={[
                { key: 'intra', label: 'Intra-state (CGST+SGST)', selected: saleGstMode === 'intra', onSelect: () => setSaleGstMode('intra') },
                { key: 'inter', label: 'Inter-state (IGST)', selected: saleGstMode === 'inter', onSelect: () => setSaleGstMode('inter') },
              ]}
              renderTrigger={({ ref, toggle, triggerProps }) => (
                <button ref={ref} {...triggerProps} onClick={toggle} type="button"
                  style={{ ...inp, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{saleGstMode === 'inter' ? 'Inter-state (IGST)' : 'Intra-state (CGST+SGST)'}</span>
                  <ChevronDown size={14} style={{ color: '#5b616e', flexShrink: 0 }} />
                </button>
              )}
            />
            {!interBranch && (custSupply === 'intra' || custSupply === 'inter' ? (
              <p style={saleGstMode === custSupply ? hintOk : hintWarn}>
                {saleGstMode === custSupply ? '✓ Auto' : '⚠ Overridden — customer state says'}: {custRec.state || stateNameOf(stateCodeOf(custRec))} → {custSupply === 'intra' ? 'Intra (CGST+SGST)' : 'Inter (IGST)'}
              </p>
            ) : custRec && !custSupply ? (
              <p style={hintWarn}>⚠ Customer has no State in the Customer Master — add it to auto-pick the mode</p>
            ) : isB2C && customer.name.trim() && !custRec ? (
              <p style={hintMuted}>ℹ B2C walk-in — not in the Customer Master. That’s fine for B2C; Sale mode stays as picked above. Add via “＋ New” (address + state) only if the sale is interstate, to auto-set IGST.</p>
            ) : null)}
          </FL>}
          {!isNoSupp && <FL label={interBranch ? 'Supplier ledger (airline / cost) *' : 'Supplier ledger (Pay to) *'}>
            {/* ledgerName MUST move with the picked supplier. The INB payload sends
                `ledgerName: supplier.ledgerName || supplier.name`, and an EDIT seeds ledgerName from
                the deal's original supplier — so leaving it behind here kept the OLD ledger name
                truthy and winning, and the backend (`party: supplier.ledgerName || supplier.name`)
                posted the cost to the PREVIOUS airline's account. Swapping the supplier on an INB
                edit looked applied and silently paid the wrong creditor. Create was unaffected
                (ledgerName starts undefined, so it fell through to name). */}
            <PartyPicker branch={branch} kind="supplier" value={{ name: supplier.name, group: supplier.ledgerGroup }}
              onChange={(v) => setSupplier({ ...supplier, name: v.name, ledgerName: v.ledgerName || v.name, ledgerGroup: v.group })} />
          </FL>}
          {!isNoSupp && !isVatBr && <FL label="Purchase GST mode">
            {suppForeign ? (
              // Import of service — the vendor charges no Indian GST, so there is no
              // intra/inter to pick; the PO grid drops its GST (and 194H TDS) to match.
              <div style={{ ...inp, display: 'flex', alignItems: 'center', background: '#eef0f4', color: '#5b616e', fontWeight: 700, cursor: 'default' }}>
                🌐 Overseas supplier — no GST (import of service)
              </div>
            ) : (
              <>
                <DropdownMenu
                  ariaLabel="Purchase GST mode"
                  menuRole="listbox"
                  items={[
                    { key: 'intra', label: 'Intra-state (CGST+SGST)', selected: purGstMode === 'intra', onSelect: () => setPurGstMode('intra') },
                    { key: 'inter', label: 'Inter-state (IGST)', selected: purGstMode === 'inter', onSelect: () => setPurGstMode('inter') },
                  ]}
                  renderTrigger={({ ref, toggle, triggerProps }) => (
                    <button ref={ref} {...triggerProps} onClick={toggle} type="button"
                      style={{ ...inp, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, cursor: 'pointer', textAlign: 'left' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{purGstMode === 'inter' ? 'Inter-state (IGST)' : 'Intra-state (CGST+SGST)'}</span>
                      <ChevronDown size={14} style={{ color: '#5b616e', flexShrink: 0 }} />
                    </button>
                  )}
                />
                {/* Shown on INB too: the supplier's state drives this leg either way, so the
                    accountant must see the same "✓ Auto" / "⚠ Overridden" evidence. Suppressing it
                    here meant an INB purchase got NO auto-pick AND no warning — silently wrong. */}
                {(suppSupply === 'intra' || suppSupply === 'inter' ? (
                  <p style={purGstMode === suppSupply ? hintOk : hintWarn}>
                    {purGstMode === suppSupply ? '✓ Auto' : '⚠ Overridden — supplier state says'}: {suppRec.state || stateNameOf(stateCodeOf(suppRec))} → {suppSupply === 'intra' ? 'Intra (CGST+SGST)' : 'Inter (IGST)'}
                  </p>
                ) : suppRec && !suppSupply ? (
                  <p style={hintWarn}>⚠ Supplier has no State in the Supplier Master — add it to auto-pick the mode</p>
                ) : null)}
              </>
            )}
          </FL>}
          {hasPackage && <FL label="Package type *">
            <DropdownMenu
              ariaLabel="Package type"
              menuRole="listbox"
              width={260}
              items={[
                { key: '', label: 'Select International / Domestic', selected: packageType === '', onSelect: () => setPackageType('') },
                { key: 'Domestic', label: 'Domestic', selected: packageType === 'Domestic', onSelect: () => setPackageType('Domestic') },
                { key: 'International', label: 'International', selected: packageType === 'International', onSelect: () => setPackageType('International') },
              ]}
              renderTrigger={({ ref, toggle, triggerProps }) => (
                <button ref={ref} {...triggerProps} onClick={toggle} type="button"
                  style={{ ...inp, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{packageType || 'Select International / Domestic'}</span>
                  <ChevronDown size={14} style={{ color: '#5b616e', flexShrink: 0 }} />
                </button>
              )}
            />
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
      <Section n="1" badge={interBranch ? 'INSO' : 'SO'} name={interBranch ? 'Inter-Branch Sales Order' : 'Sales Order'} sub={pkg ? 'what the customer pays · 5% GST on the package + 2% TCS (Intl)' : 'what the customer pays · Service Charge - 2 is GST-inclusive'} accent={SO_BAR}>
        <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #d8e0ea' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
            <thead><tr style={{ borderBottom: '2px solid ' + SO_BAR }}>
              {spec.idCols.map((c) => <th key={c.key} style={{ ...soHdrL, width: c.key === 'fn' || c.key === 'sn' ? 140 : 120 }}>{c.label}</th>)}
              {spec.fareCols.map((c) => <th key={c.key} style={{ ...soHdr, width: 95, whiteSpace: 'normal' }}>{c.label}</th>)}
              {!interBranch && <th style={{ ...soHdr, width: 95, whiteSpace: 'normal' }}>Service Charge - 2</th>}{!pkg && <th style={{ ...soHdr, width: 95, whiteSpace: 'normal' }}>Service Fee</th>}
              {!pkg && <th style={{ ...soHdr, width: 95, whiteSpace: 'normal' }}>{taxLabel}/Service Fee ({activeRate}%)</th>}{!interBranch && <th style={{ ...soHdr, width: 95, whiteSpace: 'normal' }}>{pkg ? `${taxLabel} (5%)` : `${taxLabel}/Service Charge - 2 (${activeRate}%)`}</th>}{spec.tcs && <th style={{ ...soHdr, width: 95, whiteSpace: 'normal' }}>TCS ({tcsRate}%)</th>}<th style={{ ...soHdr, width: 110, whiteSpace: 'normal' }}>Total</th><th style={{ ...soHdr, width: 45 }}></th>
            </tr></thead>
            <tbody>
              {lines.map((l, i) => {
                const c = lineCalc(spec, l, { branch: brCode, noVat: effNoVat, saleZeroRated: inbZeroRated, foreignSupplier: suppForeign });
                // TCS (Intl packages, u/s 206C(1G)) is a booking-level charge on the sale incl GST;
                // show each line's share only when it actually applies (totals.so.tcs > 0).
                const lineTcs = (spec.tcs && totals.so.tcs > 0) ? c.finalSales * tcsRate / 100 : 0;
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
              <td style={{ ...soTf, color: DR }}>{fmt(totals.so.total)}{num(totals.so.roundOff) ? <span style={{ display: 'block', fontSize: 9, fontWeight: 600, color: '#8a6d1e' }}>round off {totals.so.roundOff > 0 ? '+' : ''}{fmt(totals.so.roundOff)}</span> : null}</td><td style={soTf} />
            </tr></tfoot>
          </table>
        </div>
        {/* Markup-rule hint: the applied Service Charge - 2 % (vs fares) against the
            rule's default and GP floor. Purely advisory — the cells stay editable. */}
        {!interBranch && markupRule && (() => {
          const fares = lines.reduce((s, l) => s + fareSum(spec, l), 0);
          const mk = lines.reduce((s, l) => s + num(l.markup), 0);
          const pct = fares > 0 ? round2((mk / fares) * 100) : null;
          const below = num(markupRule.floor) > 0 && pct != null && pct < num(markupRule.floor);
          if (!below && editing) return null; // edits keep saved figures — only warn on a floor breach
          return (
            <p style={below ? hintWarn : hintOk}>
              {below
                ? `⚠ Service Charge - 2 ≈ ${pct}% of fares — below the ${markupRule.floor}% GP floor (rule: ${markupRule.value}% · ${markupRule.module})`
                : `Rate-sheet default ${markupRule.value}% (${markupRule.module === 'ALL' ? 'all modules' : markupRule.module})${num(markupRule.floor) > 0 ? ` · GP floor ${markupRule.floor}%` : ''} — auto-fills Service Charge - 2 from the fares; type your own to override`}
            </p>
          );
        })()}
        <button onClick={addLine} style={{ ...btnGh, marginTop: 8, padding: '6px 12px', fontSize: 11 }}><Plus size={12} /> Add line</button>
      </Section>

      {/* ② Purchase Order — hidden in no-supplier mode (there's no cost leg). */}
      {poSection}

      {/* N-PO: additional purchase legs (Flight +Misc / Holiday components) */}
      {!isNoSupp && ALLOWED_LEG_MODULES[moduleCode] && (
        <ExtraPurchases parentModule={moduleCode} branch={branch} brCode={brCode} noVat={effNoVat} legs={extraPOs} onChange={setExtraPOs} isForeign={isForeignSupplier} supplyOf={supplySupplierOf} />
      )}

      {/* ③ Gross Profit */}
      <Section n="3" badge={interBranch ? 'INGP' : 'GP'} name={interBranch ? 'Inter-Branch Gross Profit' : 'Gross Profit'} sub="GP = net sales − net purchase · % on final sales value" accent={GP_BAR}>
        <div className="mb-3 grid grid-cols-1 gap-3 tablet:grid-cols-3">
          <GpCard k={'Total Sales (incl ' + taxLabel + (totals.so.tcs > 0 ? ' & TCS' : '') + ')'} v={cur + ' ' + fmt(totals.so.total)} color={DARK} bg="#FFFDF7" />
          <GpCard k={'Total Purchase (incl ' + taxLabel + ')'} v={cur + ' ' + fmt(totals.po.total)} color={CR} bg="#FFFAEC" />
          <GpCard k={hasExtraLegs ? 'Gross Profit · all POs' : 'Gross Profit'} v={cur + ' ' + fmt(hasExtraLegs ? folderGpTotal : totals.gp.total)} color={DR} pct={(hasExtraLegs ? folderGpPct : totals.gp.pct) + '% margin'} bg="#FCF3DE" />
        </div>
        {hasExtraLegs && (
          <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 7, background: '#FCF3DE', border: '1px solid #cdb46a', color: '#6b5a1e', fontSize: 11.5 }}>
            Gross Profit above is the <b>whole folder</b> — it nets the {extraLegsFilled.length} additional purchase leg{extraLegsFilled.length > 1 ? 's' : ''} (−{cur} {fmt(extraLegNet)} net cost) booked under this Link No. The per-passenger table below is the <b>primary</b> sale/purchase only.
          </div>
        )}
        {totals.so.tcs > 0 && (
          <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 7, background: '#FFF7E6', border: '1px solid #F0C36D', color: '#7a5b12', fontSize: 11.5 }}>
            Incl. <b>TCS @ {tcsRate}% = {cur} {fmt(totals.so.tcs)}</b> collected from the customer on this International package (u/s 206C(1G)) — posts to <b>TCS Payable</b> (Balance Sheet), not income, so GP is unaffected.{tcsRate === 5 && ' Rate 5% applies to bookings up to 31-03-2026; 2% from 01-04-2026.'}
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
                const c = lineCalc(spec, l, { branch: brCode, noVat: effNoVat, saleZeroRated: inbZeroRated, foreignSupplier: suppForeign });
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

      {/* Inter-branch parties belong on the INB Voucher screen — Save is blocked here. */}
      {interBranchParty && (
        <div style={{ ...card, background: '#fef3e2', border: '1px solid #f0cc8a', color: '#8a5a12', fontSize: 12, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span><b>Inter-branch customer detected</b> (a Travkings branch — you're selling to another branch). This is an inter-branch <b>sale</b> — it must be entered on the <b>INB Voucher</b> screen, not SO/PO/GP. Saving here is blocked. (Buying <i>from</i> another branch is fine here.)</span>
          <button onClick={() => setRoute && setRoute('/bookings/inter-branch')} style={{ ...btnG, background: GOLD, padding: '6px 12px', fontSize: 11.5, marginLeft: 'auto' }}><ArrowRight size={13} /> Go to INB Voucher</button>
        </div>
      )}

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
        {interBranch && needsScope && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#b42318', alignSelf: 'center' }}>⚠ Pick International / Domestic to save this inter-branch {moduleCode === 'SH' ? 'Holiday' : 'Flight'} deal</span>
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
      // Refund-only economics — MUST round-trip or an edited/revoked refund re-opens
      // blank and re-posts without the airline cancellation + commission clawback (the
      // client leg would then change on re-approval). Mirrors RefundReissueFields state.
      supplierCancel: r.supplierCancel ?? '', supplierCancelGst: r.supplierCancelGst ?? '',
      cancelRecover: r.cancelRecover !== false,
      commissionReversal: r.commissionReversal !== false,
      incentiveAmt: r.incentiveAmt ?? '', incentiveGst: r.incentiveGst ?? '', incentiveTds: r.incentiveTds ?? '',
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
      // Commission Reversal OFF → the clawback is not taken, so the three incentive
      // fields post as 0 (matches RefundReissueFields, which locks them to 0 when off).
      const reverseCommission = state.commissionReversal !== false;
      const reversal = {
        counterParty: state.counterParty, counterPartyGroup: 'Sundry Creditors',
        supplierAmt: +state.supplierAmt || 0, serviceCharge: +state.serviceCharge || 0,
        otherTaxes: +state.markup || 0, gstPct: +state.gstPct || 18, gstMode: state.gstMode,
        supplierSvc: +state.supplierSvc || 0, supplierGst: +state.supplierGst || 0,
        // Airline cancellation penalty (+ its GST) and commission clawback — carried so
        // the spawned RF voucher posts the SAME journal the live JV previewed, and so an
        // edit/revoke re-opens with these populated instead of blank.
        supplierCancel: +state.supplierCancel || 0, supplierCancelGst: +state.supplierCancelGst || 0,
        cancelRecover: state.cancelRecover !== false, commissionReversal: reverseCommission,
        incentiveAmt: reverseCommission ? (+state.incentiveAmt || 0) : 0,
        incentiveGst: reverseCommission ? (+state.incentiveGst || 0) : 0,
        incentiveTds: reverseCommission ? (+state.incentiveTds || 0) : 0,
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
      // An INB-target refund/reissue lands as a pending RF/RI VOUCHER in the INB
      // approvals window (not a booking) — refresh the voucher caches so it shows there.
      if (booking.inbRefund) qc.invalidateQueries({ queryKey: ['vouchers'] });
      if (editing) invalidateBooks(qc); // an edit reverses the prior posting → refresh every books cache
      toast(`Voucher ${booking.bookingNo || ''} saved — pending approval${booking.inbRefund ? ' in the INB window (Refunds & Reissues)' : ''}`);
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
            : <button onClick={() => { setResult(null); setState((s) => ({ ...s, againstInvoice: '', supplierAmt: '', serviceCharge: '', markup: '', supplierCancel: '', supplierCancelGst: '', incentiveAmt: '', incentiveGst: '', incentiveTds: '', cancelRecover: true, commissionReversal: true })); }} style={{ ...btnG, marginTop: 18 }}><Plus size={14} /> New {kind}</button>}
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

// ── B2C bill-to picker ────────────────────────────────────────────────────────
// B2C rides on a POOLED per-staff debtor ledger, so the end-customer's state lives
// on their CUSTOMER MASTER record, not the ledger. This searches the master by name
// (picking auto-sets the Sale GST mode from the stored state) and quick-creates a
// fresh B2C customer with the COMPULSORY address + state when there's no match.
function B2cCustomerPicker({ value, customers, brCode, onChange, onPick }) {
  const [open, setOpen] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const q = value || '';
  const matches = (customers || [])
    .filter((c) => c && c.name && (!q.trim() || c.name.toLowerCase().includes(q.trim().toLowerCase())))
    .slice(0, 10);
  const wrapRef = useRef(null);
  const stateOf = (c) => c.state || stateNameOf(stateCodeOf(c));
  return (
    <div ref={wrapRef} style={{ position: 'relative' }}
      onKeyDown={listKeyNav({ onEscape: () => setOpen(false) })}
      onBlur={(e) => { if (!wrapRef.current || !wrapRef.current.contains(e.relatedTarget)) setOpen(false); }}>
      <input value={q} placeholder="Search customer master or type…"
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)} style={inp} />
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60, marginTop: 2, background: '#fff', border: '1px solid #cdd1d8', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.16)', maxHeight: 260, overflowY: 'auto' }}>
          {matches.map((c) => (
            <div key={c.id || c.name} {...clickable(() => { onPick(c); setOpen(false); }, { role: 'option' })}
              style={{ padding: '7px 11px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11.5, outline: 'none' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f4ff')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              onFocus={(e) => (e.currentTarget.style.background = '#f0f4ff')}
              onBlur={(e) => (e.currentTarget.style.background = 'transparent')}>
              <span style={{ color: '#1a1c22', fontWeight: 500 }}>{c.name}</span>
              <span style={{ color: stateOf(c) ? '#9197a3' : '#a9690a', fontSize: 9.5, fontWeight: 700, flexShrink: 0 }}>{stateOf(c) || '⚠ no state'}</span>
            </div>
          ))}
          <div {...clickable(() => { setShowNew(true); setOpen(false); }, { role: 'option' })}
            style={{ padding: '8px 11px', cursor: 'pointer', fontSize: 11.5, fontWeight: 800, color: GOLD_DEEP, background: GOLD_SOFT, borderTop: '1px solid ' + GOLD_LINE, outline: 'none' }}>
            ＋ New B2C customer{q.trim() ? ` “${q.trim()}”` : ''} — address & state compulsory
          </div>
        </div>
      )}
      {showNew && (
        <QuickCreateCustomer initialName={q.trim()} brCode={brCode}
          onClose={() => setShowNew(false)}
          onCreated={(rec) => { setShowNew(false); onPick(rec); }} />
      )}
    </div>
  );
}

// Minimal in-flow customer creation — Name, ADDRESS and STATE are compulsory (the
// state is what fixes the sale's place of supply → auto Sale GST mode); the backend
// rejects an Indian customer without them, so this validates the same rule up front.
function QuickCreateCustomer({ initialName, brCode, onClose, onCreated }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ name: initialName || '', address: '', city: '', state: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  useModalEsc(onClose, true);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const canSave = !!(f.name.trim() && f.address.trim() && f.state.trim()) && !saving;
  const lbl = { display: 'block', fontSize: 10.5, fontWeight: 700, color: '#5b616e', marginBottom: 3 };
  const save = async () => {
    if (!canSave) return;
    setSaving(true); setErr('');
    try {
      const rec = await apiPost('/api/customers', {
        name: f.name.trim(), branch: brCode || '', country: 'India',
        address: f.address.trim(), city: f.city.trim(), state: f.state,
        phone: f.phone.trim(), email: f.email.trim(),
      });
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['master', 'customers'] });
      toast(`Customer ${rec?.name || f.name.trim()} created`);
      onCreated(rec || { name: f.name.trim(), ...f });
    } catch (e) { setErr(e.message || 'Failed to create customer'); }
    finally { setSaving(false); }
  };
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(13,19,38,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 10, width: 'min(540px, 94vw)', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 18px 50px rgba(13,19,38,.28)', padding: '18px 20px', fontFamily: HELV }}>
        <h3 style={{ margin: 0, fontSize: 15, color: DARK }}>＋ New B2C customer</h3>
        <p style={{ margin: '4px 0 14px', fontSize: 11.5, color: '#5b616e' }}>
          Address & State are <b>compulsory</b> — the state vs {brCode || 'the branch'}&rsquo;s home state ({homeStateNameForBranch(brCode)}) auto-sets this voucher&rsquo;s <b>Sale GST mode</b>.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><span style={lbl}>Full name *</span><input value={f.name} onChange={set('name')} style={inp} /></div>
          <div><span style={lbl}>State *</span>
            <select value={f.state} onChange={set('state')} style={inp}>
              {STATE_NAMES.map((s) => <option key={s} value={s}>{s === '' ? '— Select state —' : s}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1/-1' }}><span style={lbl}>Address *</span>
            <textarea value={f.address} onChange={set('address')} rows={2} style={{ ...inp, height: 'auto', resize: 'vertical' }} />
          </div>
          <div><span style={lbl}>City</span><input value={f.city} onChange={set('city')} style={inp} /></div>
          <div><span style={lbl}>Phone</span><input value={f.phone} onChange={set('phone')} style={inp} /></div>
          <div style={{ gridColumn: '1/-1' }}><span style={lbl}>Email</span><input value={f.email} onChange={set('email')} type="email" style={inp} /></div>
        </div>
        {err && <div style={{ margin: '12px 0 0', padding: '8px 12px', borderRadius: 8, background: '#fbe9e9', border: '1px solid #f3c9c9', color: '#dc2626', fontSize: 11.5, fontWeight: 700 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 9, justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="button" onClick={onClose} disabled={saving} style={btnGh}>Cancel</button>
          <button type="button" onClick={save} disabled={!canSave} style={{ ...btnG, opacity: canSave ? 1 : 0.5 }}>{saving ? 'Creating…' : 'Create customer'}</button>
        </div>
      </div>
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

// Exported — BookingTable (modules/approvals/bookingApprovals.jsx) reuses this
// exact JV expansion for its own booking rows.
export function JournalView({ id, cur, date }) {
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
        {date && <span>Voucher Date: <b style={{ color: DARK }}>{date}</b></span>}
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
