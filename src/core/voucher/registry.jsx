import React from 'react';
import { todayISO } from '../dates';
import { JournalFields } from './fields/JournalFields';
import { ReceiptPaymentFields } from './fields/ReceiptPaymentFields';
import { ContraFields } from './fields/ContraFields';
import { PurchaseExpenseFields } from './fields/PurchaseExpenseFields';
import { NoteFields } from './fields/NoteFields';
import { RefundReissueFields } from './fields/RefundReissueFields';
import { AdmAcmFields } from './fields/AdmAcmFields';
import { r2, allocSummary, pxpTotals } from './ui';

// Recover a saved income line's amount (Service Charge / Markup) for the edit form.
const lineAmt = (v, ledger) => {
  const l = (v.lines || []).find((x) => x.ledger === ledger);
  return l ? (l.amt ?? '') : '';
};

/**
 * Voucher category registry (Option C).
 *
 * Each entry fully describes one voucher category so a single shell can render
 * it in BOTH create and edit mode. Four hooks per category:
 *   initial(ctx)        → blank form state (create)
 *   fromVoucher(v, ctx) → seed form state from a saved voucher (edit)
 *   toBody(state, ctx)  → serialize form state → API payload
 *   validate(state)     → { ok, hint } for the save button + balance
 *   fields              → render function for the category-specific inputs
 *
 * Only categories present here route through the shell; everything else falls
 * back to the legacy generic editor (strangler migration).
 */

const blankLine = (k, drCr = 'Dr') => ({ _k: k, ledger: '', drCr, amt: '' });

/**
 * Receipt / Payment share one engine — `side` flips direction:
 *   customer → Receipt (RV): Dr Bank/Cash, Cr Debtor
 *   supplier → Payment (PMT): Dr Creditor, Cr Bank/Cash
 * These vouchers are stored WITHOUT explicit lines; the backend infers the
 * journal from party + bankRef + total + tdsAmt, so toBody emits no `lines`.
 */
function makeRcptPmt(side) {
  const isReceipt = side === 'customer';
  return {
    type: isReceipt ? 'RV' : 'PMT',
    label: isReceipt ? 'Receipt Voucher' : 'Payment Voucher',
    icon: isReceipt ? '💰' : '💸',
    explain: isReceipt
      ? (<><b style={{ color: '#A07828' }}>Receipt:</b> money coming <b>in</b>. Cash/Bank is <b>Debited</b> and the chosen account <b>Credited</b> — a <b>customer</b> (with bill-wise allocation), or any other account (loan, interest, capital…) as a direct entry.</>)
      : (<><b style={{ color: '#A07828' }}>Payment:</b> money going <b>out</b>. Cash/Bank is <b>Credited</b> and the chosen account <b>Debited</b> — a <b>supplier</b> (with bill-wise allocation), or any other account (rent, salary, loan, tax…) as a direct expense entry.</>),

    initial: () => ({
      date: todayISO(), party: '', otherType: '', bankRef: '', paymentMode: 'NEFT', utr: '',
      amount: '', tds: false, tdsAmt: 0, tdsSection: '194H', remarks: '',
      alloc: {}, applyMode: 'bills', parkOnAcc: false, _billIds: {},
    }),

    fromVoucher: (v) => {
      const alloc = {}, billIds = {};
      (v.allocations || []).forEach((a) => { alloc[a.billVno] = a.amount; billIds[a.billVno] = a.billId || ''; });
      // Receipts/payments entered or imported as explicit Dr/Cr legs (Tally import,
      // CRM push, legacy entry) carry NO party/bankRef — recover them from the lines
      // so the edit form shows what was actually entered:
      //   receipt → Dr = Bank/Cash, Cr = party (debtor)
      //   payment → Dr = party (creditor), Cr = Bank/Cash
      const lines = v.lines || [];
      const bankish = (l) => /\bbank\b|\bcash\b|petty/i.test(l && l.ledger || '');
      const drLines = lines.filter((l) => l.drCr === 'Dr');
      const crLines = lines.filter((l) => l.drCr === 'Cr');
      const bankLines = isReceipt ? drLines : crLines;   // bank/cash leg side
      const partyLines = isReceipt ? crLines : drLines;  // counter-ledger side
      const bankLine = bankLines.find(bankish) || bankLines[0] || null;
      const partyLine = partyLines.find((l) => !bankish(l)) || partyLines[0] || null;
      let party = v.party || '';
      let bankRef = v.bankRef || '';
      if (!party && partyLine) party = partyLine.ledger || '';
      if (!bankRef && bankLine) bankRef = bankLine.ledger || '';
      // Amount: prefer an explicit net (subtotal>0) → else total net of TDS → else the bank-leg amount.
      let amount = (+v.subtotal > 0) ? +v.subtotal : ((+v.total || 0) - (+v.tdsAmt || 0));
      if (!(amount > 0) && bankLine) amount = +bankLine.amt || 0;
      // Best-effort party flag so the model is right on first render; the field
      // component re-derives otherType from the live chart once it loads.
      const looksParty = !!v.party && (v.partyType === (isReceipt ? 'customer' : 'supplier') || (v.allocations || []).length > 0);
      return {
        date: v.date || '', party, otherType: looksParty ? (isReceipt ? 'Debtor' : 'Creditor') : '', bankRef, paymentMode: v.paymentMode || 'NEFT', utr: v.utr || '',
        amount, tds: (+v.tdsAmt || 0) > 0, tdsAmt: +v.tdsAmt || 0, tdsSection: v.tdsSection || '194H', remarks: v.remarks || '',
        alloc, applyMode: v.applyMode || 'bills', parkOnAcc: (+v.onAccount || 0) > 0, _billIds: billIds,
      };
    },

    // A true party leg (Debtor for a receipt, Creditor for a payment) keeps the
    // bill-wise model: party + total + allocations, no lines → the backend infers
    // the journal and tracks the sub-ledger. ANY OTHER ledger (expense, loan, tax,
    // income…) posts as an explicit Dr/Cr pair, exactly like Tally — the backend's
    // receiptLines/paymentLines post lines with drCr verbatim (no inference).
    isParty: (s) => s.otherType === (isReceipt ? 'Debtor' : 'Creditor'),

    toBody: (s, ctx) => {
      const net = +s.amount || 0;
      const party = s.otherType === (isReceipt ? 'Debtor' : 'Creditor');
      const common = {
        type: isReceipt ? 'RV' : 'PMT', category: isReceipt ? 'receipt' : 'payment',
        branch: ctx.branchCode, date: s.date,
        bankRef: s.bankRef, paymentMode: s.paymentMode,
        status: 'saved',
      };
      if (!party) {
        // Direct (non-party) entry — a clean two-leg journal. No TDS/bill-wise here
        // (use Purchase-Expense for a credit GST bill, Journal for a split entry).
        const amt = r2(net);
        const lines = isReceipt
          ? [{ ledger: s.bankRef, amt, drCr: 'Dr', desc: s.remarks || '' }, { ledger: s.party, amt, drCr: 'Cr', desc: s.remarks || '' }]
          : [{ ledger: s.party, amt, drCr: 'Dr', desc: s.remarks || '' }, { ledger: s.bankRef, amt, drCr: 'Cr', desc: s.remarks || '' }];
        return {
          ...common, party: '', partyType: '',
          lines, subtotal: amt, total: amt, tdsAmt: 0, allocations: [], onAccount: 0, applyMode: '',
          remarks: s.remarks || `Being ${isReceipt ? 'amount received — Cr' : 'amount paid — Dr'} ${s.party} via ${s.paymentMode}${s.utr ? ` ref ${s.utr}` : ''}`,
        };
      }
      const tds = s.tds ? (+s.tdsAmt || 0) : 0;
      const gross = r2(net + tds);
      const sum = allocSummary(s.alloc, gross, s.parkOnAcc, s.applyMode);
      const allocations = Object.entries(s.alloc || {})
        .filter(([, v]) => (+v || 0) > 0)
        .map(([vno, v]) => ({ billVno: vno, billId: (s._billIds || {})[vno] || '', amount: +v }));
      return {
        ...common, party: s.party, partyType: isReceipt ? 'customer' : 'supplier',
        subtotal: net, total: gross, tdsAmt: tds, tdsSection: s.tds ? (s.tdsSection || '') : '',
        allocations, onAccount: sum.onAcc, applyMode: s.applyMode,
        remarks: s.remarks || `Being ${isReceipt ? 'receipt from' : 'payment to'} ${s.party} via ${s.paymentMode}${s.utr ? ` ref ${s.utr}` : ''}`,
      };
    },

    validate: (s) => {
      const net = +s.amount || 0;
      const party = s.otherType === (isReceipt ? 'Debtor' : 'Creditor');
      let hint = '';
      if (!s.party) hint = `(Pick ${isReceipt ? 'account credited' : 'account debited'})`;
      else if (!s.bankRef) hint = '(Pick Bank / Cash)';
      else if (net <= 0 && !party) hint = '(Enter Amount)';
      if (!party) return { ok: !!s.party && !!s.bankRef && net > 0, hint };
      // party leg → keep the bill-wise / on-account allocation rule
      const tds = s.tds ? (+s.tdsAmt || 0) : 0;
      const gross = r2(net + tds);
      const sum = allocSummary(s.alloc, gross, s.parkOnAcc, s.applyMode);
      if (gross <= 0) hint = '(Enter Amount)';
      else if (!sum.valid) hint = s.applyMode === 'bills' ? '(Allocate / On Account)' : '';
      return { ok: !!s.party && !!s.bankRef && gross > 0 && sum.valid, hint };
    },

    fields: (props) => <ReceiptPaymentFields {...props} side={side} />,
  };
}

/**
 * Credit Note (sales return) / Debit Note (purchase return) — `kind` flips the
 * party side, base return ledger and GST direction. Stored with a single return
 * line + taxAmt/gstMode/tcsAmt; the backend reverses income/expense + GST + TCS.
 */
function makeNote(kind) {
  const isCredit = kind === 'credit';
  const baseLedger = isCredit ? 'Sales Return' : 'Purchase Return';
  const reasons = isCredit
    ? ['Ticket Cancellation / Refund', 'Fare Correction', 'Sales Return', 'Discount Allowed', 'Rate Difference']
    : ['Ticket Cancellation by Airline', 'Purchase Return', 'Rate Difference', 'Overcharge Correction', 'Discount Received'];
  return {
    type: isCredit ? 'SCN' : 'SDN',
    label: isCredit ? 'Credit Note' : 'Debit Note',
    icon: isCredit ? '📋' : '📈',
    explain: isCredit
      ? (<><b style={{ color: '#A07828' }}>Credit Note:</b> issued to a <b>customer</b> to reduce what they owe. The income &amp; output GST are <b>Debited</b> (reversed); the customer is <b>Credited</b>.</>)
      : (<><b style={{ color: '#A07828' }}>Debit Note:</b> issued to a <b>supplier</b> to reduce what you owe. The supplier is <b>Debited</b>; the purchase &amp; input GST are <b>Credited</b> (reversed).</>),

    initial: () => ({ date: todayISO(), againstInvoice: '', gstMode: 'intra', party: '', reason: reasons[0], taxable: '', gstPct: 18, tcs: '', remarks: '' }),

    fromVoucher: (v) => ({
      date: v.date || '', againstInvoice: v.againstInvoice || v.linkNo || '', gstMode: v.gstMode || 'intra',
      party: v.party || '', reason: (v.lines && v.lines[0] && v.lines[0].desc) || reasons[0],
      taxable: v.subtotal ?? '', gstPct: v.gstPct != null && +v.gstPct ? +v.gstPct : 18, tcs: v.tcsAmt || '', remarks: v.remarks || '',
    }),

    toBody: (s, ctx) => {
      const taxable = r2(+s.taxable || 0);
      const gstAmt = r2(taxable * (+s.gstPct || 0) / 100);
      const tcs = r2(+s.tcs || 0);
      const total = r2(taxable + gstAmt + tcs);
      return {
        type: isCredit ? 'SCN' : 'SDN', category: isCredit ? 'credit-note' : 'debit-note', branch: ctx.branchCode, date: s.date,
        party: s.party, partyType: isCredit ? 'customer' : 'supplier',
        lines: [{ ledger: baseLedger, amt: taxable, desc: s.reason }],
        subtotal: taxable, taxAmt: gstAmt, gstMode: s.gstMode, gstPct: +s.gstPct || 0, tcsAmt: tcs, total,
        againstInvoice: s.againstInvoice, linkNo: s.againstInvoice,
        remarks: s.remarks || `Being ${isCredit ? 'credit' : 'debit'} note — ${s.reason}${s.againstInvoice ? ` vs ${s.againstInvoice}` : ''}`,
        status: 'saved',
      };
    },

    validate: (s) => {
      const taxable = +s.taxable || 0;
      let hint = '';
      if (!s.party) hint = `(Pick ${isCredit ? 'Customer' : 'Supplier'})`;
      else if (taxable <= 0) hint = '(Enter Amount)';
      return { ok: !!s.party && taxable > 0, hint };
    },

    fields: (props) => <NoteFields {...props} kind={kind} reasons={reasons} />,
  };
}

/**
 * Refund (RF) / Reissue (RI) — two-party, raised against a sales invoice. The
 * supplier (airline) leg is supplierAmt; our retained service charge + markup
 * post as income; the customer figure (`total`) is derived so the voucher always
 * balances. Gated → enters PENDING and posts on approval. See posting.builder.
 */
function makeRefundReissue(kind) {
  const isRefund = kind === 'refund';
  return {
    type: isRefund ? 'RF' : 'RI',
    label: isRefund ? 'Refund Voucher' : 'Reissue Voucher',
    icon: isRefund ? '↩️' : '🔁',
    explain: isRefund
      ? (<><b style={{ color: '#A07828' }}>Refund:</b> cancellation of a sale. The <b>supplier/airline (Creditor) is Debited</b> with the refund receivable; we retain a service charge + markup (income), and the <b>customer (Debtor) is Credited</b> with the balance refunded.</>)
      : (<><b style={{ color: '#A07828' }}>Reissue:</b> amendment of a sale. The <b>customer (Debtor) is Debited</b> with the total billed; the <b>supplier/airline (Creditor) is Credited</b> with the fee + fare difference; our service charge + markup are retained as income.</>),

    initial: () => ({ date: todayISO(), againstInvoice: '', gstMode: 'intra', party: '', counterParty: '', supplierAmt: '', serviceCharge: '', markup: '', gstPct: 18, supplierSvc: '', supplierGst: '', remarks: '' }),

    fromVoucher: (v) => ({
      date: v.date || '', againstInvoice: v.againstInvoice || v.linkNo || '', gstMode: v.gstMode || 'intra',
      party: v.party || '', counterParty: v.counterParty || '', supplierAmt: v.supplierAmt ?? '',
      serviceCharge: lineAmt(v, 'Service Charge Income'), markup: lineAmt(v, 'Markup Income'),
      gstPct: v.gstPct != null && +v.gstPct ? +v.gstPct : 18,
      supplierSvc: v.supplierSvc ?? '', supplierGst: v.supplierGst ?? '', remarks: v.remarks || '',
    }),

    toBody: (s, ctx) => {
      const supplierAmt = r2(+s.supplierAmt || 0);
      const svc = r2(+s.serviceCharge || 0), markup = r2(+s.markup || 0);
      const ourIncome = r2(svc + markup);
      const taxAmt = r2(ourIncome * (+s.gstPct || 0) / 100);
      const supSvc = r2(+s.supplierSvc || 0), supGst = r2(+s.supplierGst || 0);
      const total = isRefund
        ? r2(supplierAmt + supSvc + supGst - ourIncome - taxAmt)
        : r2(supplierAmt - supSvc - supGst + ourIncome + taxAmt);
      const lines = [];
      if (svc > 0) lines.push({ ledger: 'Service Charge Income', amt: svc, desc: 'Service charge' });
      if (markup > 0) lines.push({ ledger: 'Markup Income', amt: markup, desc: 'Markup' });
      return {
        type: isRefund ? 'RF' : 'RI', category: kind, branch: ctx.branchCode, date: s.date,
        party: s.party, partyType: 'customer',
        counterParty: s.counterParty, counterPartyGroup: 'Sundry Creditors',
        supplierAmt, supplierSvc: supSvc, supplierGst: supGst,
        lines, subtotal: ourIncome, taxAmt, gstMode: s.gstMode, gstPct: +s.gstPct || 0, total,
        againstInvoice: s.againstInvoice, linkNo: s.againstInvoice,
        remarks: s.remarks || `Being ${kind}${s.againstInvoice ? ` against ${s.againstInvoice}` : ''}`,
        status: 'saved',
      };
    },

    validate: (s) => {
      const supplierAmt = +s.supplierAmt || 0;
      let hint = '';
      if (!s.againstInvoice) hint = '(Reference invoice)';
      else if (!s.party) hint = '(Pick customer)';
      else if (!s.counterParty) hint = '(Pick supplier/airline)';
      else if (supplierAmt <= 0) hint = '(Enter supplier amount)';
      return { ok: !!s.againstInvoice && !!s.party && !!s.counterParty && supplierAmt > 0, hint };
    },

    fields: (props) => <RefundReissueFields {...props} kind={kind} />,
  };
}

/**
 * ADM (Agent Debit Memo) / ACM (Agent Credit Memo) — independent BSP memos. The
 * "Pass on" toggle flips the posting: absorb (single-party vs the BSP/airline) or
 * pass-to-customer (two-party, ADM ≈ reissue / ACM ≈ refund). Gated → PENDING.
 */
function makeAdmAcm(kind) {
  const isAdm = kind === 'adm';
  return {
    type: isAdm ? 'ADM' : 'ACM',
    label: isAdm ? 'ADM Voucher' : 'ACM Voucher',
    icon: isAdm ? '📉' : '📈',
    explain: isAdm
      ? (<><b style={{ color: '#A07828' }}>ADM (Agent Debit Memo):</b> the airline debits the agency via BSP. <b>Absorb</b> → booked as ADM Charges (cost) vs the airline; <b>Pass to customer</b> → re-billed like a reissue.</>)
      : (<><b style={{ color: '#A07828' }}>ACM (Agent Credit Memo):</b> the airline credits the agency via BSP. <b>Absorb</b> → booked as ACM Recovery (income) vs the airline; <b>Pass to customer</b> → credited back like a refund.</>),

    initial: () => ({ date: todayISO(), againstInvoice: '', reasonCode: '', counterParty: '', amount: '', passOn: false, party: '', serviceCharge: '', markup: '', gstPct: 18, gstMode: 'intra', remarks: '' }),

    fromVoucher: (v) => ({
      date: v.date || '', againstInvoice: v.againstInvoice || '', reasonCode: v.reasonCode || '',
      counterParty: v.counterParty || '', amount: v.supplierAmt ?? v.subtotal ?? '',
      passOn: !!v.passOn, party: v.party || '',
      serviceCharge: lineAmt(v, 'Service Charge Income'), markup: lineAmt(v, 'Markup Income'),
      gstPct: v.gstPct != null && +v.gstPct ? +v.gstPct : 18, gstMode: v.gstMode || 'intra', remarks: v.remarks || '',
    }),

    toBody: (s, ctx) => {
      const amount = r2(+s.amount || 0);
      const passOn = !!s.passOn;
      const base = {
        type: isAdm ? 'ADM' : 'ACM', category: kind, branch: ctx.branchCode, date: s.date,
        passOn, reasonCode: s.reasonCode || '',
        counterParty: s.counterParty, counterPartyGroup: 'Sundry Creditors', againstInvoice: s.againstInvoice || '',
        remarks: s.remarks || `Being ${isAdm ? 'Agent Debit' : 'Agent Credit'} Memo${s.reasonCode ? ` (${s.reasonCode})` : ''}`,
        status: 'saved',
      };
      if (!passOn) return { ...base, party: '', gstMode: '', gstPct: 0, subtotal: amount, taxAmt: 0, supplierAmt: amount, total: amount };
      const svc = r2(+s.serviceCharge || 0), markup = r2(+s.markup || 0);
      const ourIncome = r2(svc + markup);
      const taxAmt = r2(ourIncome * (+s.gstPct || 0) / 100);
      const lines = [];
      if (svc > 0) lines.push({ ledger: 'Service Charge Income', amt: svc, desc: 'Service charge' });
      if (markup > 0) lines.push({ ledger: 'Markup Income', amt: markup, desc: 'Markup' });
      const total = isAdm ? r2(amount + ourIncome + taxAmt) : r2(amount - ourIncome - taxAmt);
      return { ...base, party: s.party, partyType: 'customer', gstMode: s.gstMode, gstPct: +s.gstPct || 0, supplierAmt: amount, subtotal: ourIncome, taxAmt, lines, total };
    },

    validate: (s) => {
      const amount = +s.amount || 0;
      let hint = '';
      if (!s.counterParty) hint = '(Pick airline/BSP)';
      else if (amount <= 0) hint = '(Enter amount)';
      else if (s.passOn && !s.party) hint = '(Pick customer)';
      return { ok: !!s.counterParty && amount > 0 && (!s.passOn || !!s.party), hint };
    },

    fields: (props) => <AdmAcmFields {...props} kind={kind} />,
  };
}

export const VOUCHER_REGISTRY = {
  receipt: makeRcptPmt('customer'),
  payment: makeRcptPmt('supplier'),
  'credit-note': makeNote('credit'),
  'debit-note': makeNote('debit'),
  refund: makeRefundReissue('refund'),
  reissue: makeRefundReissue('reissue'),
  adm: makeAdmAcm('adm'),
  acm: makeAdmAcm('acm'),

  contra: {
    type: 'CV',
    label: 'Contra Voucher',
    icon: '🔄',
    explain: (<><b style={{ color: '#A07828' }}>Contra:</b> moving funds between your own Cash &amp; Bank accounts. One is <b>Debited</b>, the other <b>Credited</b> — same amount, entered once.</>),

    initial: () => ({ date: todayISO(), drLedger: '', crLedger: '', amount: '', ref: '', remarks: '' }),

    fromVoucher: (v) => {
      // Imported/legacy contras store BOTH legs in lines with an empty bankRef;
      // new-form contras store the Dr leg in lines[0] + the source (Cr) in bankRef.
      // Recover both directions so the edit form shows what was entered.
      const lines = v.lines || [];
      const drLine = lines.find((l) => l.drCr === 'Dr') || lines[0] || null;
      const crLine = lines.find((l) => l.drCr === 'Cr') || (lines.length > 1 ? lines[1] : null);
      return {
        date: v.date || '',
        drLedger: (drLine && drLine.ledger) || '',           // destination (Dr)
        crLedger: v.bankRef || (crLine && crLine.ledger) || '', // source (Cr)
        amount: (+v.total > 0) ? v.total : (drLine ? (drLine.amt ?? '') : ''),
        ref: '',
        remarks: v.remarks || '',
      };
    },

    toBody: (s, ctx) => {
      const amt = r2(+s.amount || 0);
      return {
        type: 'CV', category: 'contra', branch: ctx.branchCode, date: s.date,
        party: '', partyType: 'bank',
        bankRef: s.crLedger,                                              // source (Cr)
        lines: [{ ledger: s.drLedger, amt, desc: `Transfer in from ${s.crLedger}` }], // dest (Dr), no drCr → inference
        subtotal: amt, total: amt,
        remarks: s.remarks || `Being contra — transfer from ${s.crLedger} to ${s.drLedger}${s.ref ? ` (${s.ref})` : ''}`,
        status: 'saved',
      };
    },

    validate: (s) => {
      const amt = +s.amount || 0;
      let hint = '';
      if (!s.drLedger || !s.crLedger) hint = '(Pick two accounts)';
      else if (s.drLedger === s.crLedger) hint = '(Accounts must differ)';
      else if (amt <= 0) hint = '(Enter amount)';
      return { ok: !!s.drLedger && !!s.crLedger && s.drLedger !== s.crLedger && amt > 0, hint };
    },

    fields: (props) => <ContraFields {...props} />,
  },

  journal: {
    type: 'JV',
    label: 'Journal Voucher',
    icon: '📒',
    explain: (
      <><b style={{ color: '#A07828' }}>Journal:</b> adjustment entries with line-by-line DR/CR. Add as many lines as needed — <b>Total Debit must equal Total Credit</b> to save.</>
    ),

    initial: () => ({ date: todayISO(), remarks: '', lines: [blankLine(1, 'Dr'), blankLine(2, 'Cr')] }),

    fromVoucher: (v) => ({
      date: v.date || '',
      remarks: v.remarks || v.narration || '',
      lines: (v.lines && v.lines.length ? v.lines : [blankLine(1, 'Dr'), blankLine(2, 'Cr')])
        .map((l, i) => ({ _k: i + 1, ledger: l.ledger || '', drCr: l.drCr === 'Cr' ? 'Cr' : 'Dr', amt: l.amt ?? '' })),
    }),

    toBody: (s, ctx) => {
      const lines = (s.lines || [])
        .filter((l) => l.ledger && (+l.amt || 0) > 0)
        .map((l) => ({ ledger: l.ledger, amt: +l.amt || 0, drCr: l.drCr === 'Cr' ? 'Cr' : 'Dr', desc: s.remarks || '' }));
      const tDr = r2(lines.filter((l) => l.drCr === 'Dr').reduce((a, l) => a + l.amt, 0));
      return {
        type: 'JV', category: 'journal', branch: ctx.branchCode, date: s.date,
        lines, subtotal: tDr, total: tDr,
        remarks: s.remarks || 'Being adjustment entry passed',
        status: 'saved',
      };
    },

    validate: (s) => {
      const lines = (s.lines || []).filter((l) => l.ledger && (+l.amt || 0) > 0);
      const dr = lines.filter((l) => l.drCr !== 'Cr').reduce((a, l) => a + (+l.amt || 0), 0);
      const cr = lines.filter((l) => l.drCr === 'Cr').reduce((a, l) => a + (+l.amt || 0), 0);
      const balanced = Math.abs(dr - cr) < 0.01;
      let hint = '';
      if (lines.length < 2) hint = '(Min 2 lines)';
      else if (!balanced) hint = '(Balance First)';
      return { ok: balanced && lines.length >= 2 && dr > 0, hint };
    },

    fields: (props) => <JournalFields {...props} />,
  },

  'purchase-expense': {
    type: 'PXP',
    label: 'Purchase Voucher',
    icon: '🧾',
    explain: (<><b style={{ color: '#A07828' }}>Purchase:</b> an expense/asset bought from a supplier on credit. The <b>expense/asset and input GST are Debited</b>; the <b>supplier (Sundry Creditors) is Credited</b> with the total. A <b>Discount Received (Cr)</b> line reduces the payable. <b>TDS</b> is withheld on the taxable value.</>),

    initial: () => ({
      date: todayISO(), billNo: '', party: '',
      gstApplicable: true, gstMode: 'intra', gstPct: 18, gstAmt: 0,
      tdsSection: 'None', tdsAmt: 0, remarks: '', attachments: [],
      lines: [{ _k: 1, ledger: '', drCr: 'Dr', amt: '', desc: '' }],
    }),

    fromVoucher: (v) => ({
      date: v.date || '', billNo: v.billNo || v.againstInvoice || '', party: v.party || '',
      gstApplicable: (+v.taxAmt || 0) > 0 || !!v.gstMode,
      gstMode: v.gstMode || 'intra', gstPct: v.gstPct != null && +v.gstPct ? +v.gstPct : 18, gstAmt: +v.taxAmt || 0,
      tdsSection: v.tdsSection || 'None', tdsAmt: +v.tdsAmt || 0,
      remarks: v.remarks || '', attachments: v.attachments || [],
      lines: (v.lines && v.lines.length ? v.lines : [{ ledger: '', drCr: 'Dr', amt: '', desc: '' }])
        .map((l, i) => ({ _k: i + 1, ledger: l.ledger || '', drCr: l.drCr === 'Cr' ? 'Cr' : 'Dr', amt: l.amt ?? '', desc: l.desc || '' })),
    }),

    toBody: (s, ctx) => {
      const t = pxpTotals(s);
      const lines = (s.lines || [])
        .filter((l) => l.ledger && (+l.amt || 0) !== 0)
        .map((l) => ({ ledger: l.ledger, amt: +l.amt || 0, drCr: l.drCr === 'Cr' ? 'Cr' : 'Dr', desc: l.desc || '' }));
      return {
        type: 'PXP', category: 'purchase-expense', branch: ctx.branchCode, date: s.date,
        party: s.party, partyType: 'supplier', billNo: s.billNo, againstInvoice: s.billNo,
        lines, subtotal: t.taxable, taxAmt: t.gstAmt, gstMode: s.gstApplicable ? s.gstMode : '',
        gstPct: s.gstApplicable ? (+s.gstPct || 0) : 0, tdsSection: s.tdsSection || '', tdsAmt: t.tds, total: t.total,
        attachments: (s.attachments || []).filter((a) => a.name && a.name.trim()).map((a) => ({ name: a.name.trim(), url: a.url || '' })),
        remarks: s.remarks || `Being ${s.gstApplicable ? 'GST ' : ''}expense/asset purchase from ${s.party}${s.billNo ? ` vide bill ${s.billNo}` : ''}`,
        status: 'saved',
      };
    },

    validate: (s) => {
      const t = pxpTotals(s);
      const lines = (s.lines || []).filter((l) => l.ledger && (+l.amt || 0) !== 0);
      let hint = '';
      if (!s.party) hint = '(Pick Supplier)';
      else if (!lines.length) hint = '(Add expense lines)';
      else if (t.total <= 0) hint = '(Enter amount)';
      return { ok: !!s.party && lines.length > 0 && lines.every((l) => l.ledger) && t.total > 0, hint };
    },

    fields: (props) => <PurchaseExpenseFields {...props} />,
  },
};

export const hasRegistry = (category) => !!VOUCHER_REGISTRY[category];
