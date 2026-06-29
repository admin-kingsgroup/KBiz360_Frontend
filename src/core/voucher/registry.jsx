import React from 'react';
import { todayISO } from '../dates';
import { JournalFields } from './fields/JournalFields';
import { ReceiptPaymentFields } from './fields/ReceiptPaymentFields';
import { ContraFields } from './fields/ContraFields';
import { PurchaseExpenseFields } from './fields/PurchaseExpenseFields';
import { DebitNoteFields } from './fields/DebitNoteFields';
import { RefundReissueFields } from './fields/RefundReissueFields';
import { buildRefundReissueBody } from './fields/refundBody';
import { RefundPartialFields } from './fields/RefundPartialFields';
import { AdmAcmFields } from './fields/AdmAcmFields';
import { r2, allocSummary, pxpTotals, dnTotals } from './ui';

// Recover a saved income line's amount (Service Charge / SVC2) for the edit form.
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
        // Party model carries NO lines — the journal is inferred from party + bankRef +
        // total. Emit lines:[] EXPLICITLY so editing a line-model voucher (e.g. a Tally
        // import stored as Dr/Cr lines) into the party model wipes the stale legs instead
        // of leaving them on the document (a partial $set update wouldn't clear them).
        lines: [],
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
 * Refund (RF) / Reissue (RI) — two-party, raised against a sales invoice. The
 * supplier (airline) leg is supplierAmt; our retained service charge + Service Charge - 2
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
      ? (<><b style={{ color: '#A07828' }}>Refund:</b> cancellation of a sale — the <b>original sale and its purchase are reversed in full</b> (Base Fare / taxes on both Sales &amp; Purchase unwind). We then retain a cancellation service charge + Service Charge - 2 (income) and absorb the airline's cancellation fee; the <b>customer is refunded the net balance</b>. Link the related Purchase invoice so the supplier side also reverses.</>)
      : (<><b style={{ color: '#A07828' }}>Reissue:</b> amendment of a sale. The <b>customer (Debtor) is Debited</b> with the total billed; the <b>supplier/airline (Creditor) is Credited</b> with the fee + fare difference; our service charge + Service Charge - 2 are retained as income.</>),

    initial: () => ({ date: todayISO(), againstInvoice: '', againstPurchase: '', gstMode: 'intra', party: '', counterParty: '', supplierAmt: '', serviceCharge: '', markup: '', gstPct: 18, supplierSvc: '', supplierGst: '', supplierCancel: '', supplierCancelGst: '', cancelRecover: true, incentiveAmt: '', incentiveGst: '', incentiveTds: '', remarks: '' }),

    fromVoucher: (v) => ({
      date: v.date || '', againstInvoice: v.againstInvoice || v.linkNo || '', againstPurchase: v.againstPurchase || '', gstMode: v.gstMode || 'intra',
      party: v.party || '', counterParty: v.counterParty || '', supplierAmt: v.supplierAmt ?? '',
      serviceCharge: lineAmt(v, 'SVF Income') || lineAmt(v, 'Service Charge Income'), markup: lineAmt(v, 'SVC2 Income') || lineAmt(v, 'Markup Income'),
      gstPct: v.gstPct != null && +v.gstPct ? +v.gstPct : 18,
      supplierSvc: v.supplierSvc ?? '', supplierGst: v.supplierGst ?? '',
      supplierCancel: v.supplierCancel ?? '', supplierCancelGst: v.supplierCancelGst ?? '', cancelRecover: v.cancelRecover !== false,
      incentiveAmt: v.incentiveAmt ?? '', incentiveGst: v.incentiveGst ?? '', incentiveTds: v.incentiveTds ?? '', remarks: v.remarks || '',
    }),

    toBody: (s, ctx) => buildRefundReissueBody(s, ctx, kind),

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
    // The refund/reissue field component renders its OWN live JV right under the form,
    // so the shell's generic editor journal would just duplicate it. (Post-save view
    // still shows the shell journal.)
    hideShellJournal: true,
  };
}

/**
 * Refund PARTIAL — cancellation of only PART of a booking. Like a Refund it links the
 * original sale + purchase, but instead of unwinding the whole booking it reverses
 * only the entered amount off the basic fare/cost head, refunds the customer and
 * recovers the same from the supplier (the rest of the booking is untouched, net P&L
 * nil). Stored as a refund (so it flows through the same register / approval / posting
 * plumbing) but carries partialAmount, which the engine uses to take the partial path
 * (posting.builder refundPartialLines). GATED → PENDING → posts on approval.
 */
function makeRefundPartial() {
  return {
    type: 'RF',
    label: 'Refund Partial Voucher',
    icon: '↩️',
    explain: (<><b style={{ color: '#A07828' }}>Refund (Partial):</b> reverses only <b>part</b> of a booking. Enter the amount to refund — the linked sale &amp; purchase <b>basic fare/cost is reversed by that amount</b>, the customer is refunded and the supplier recovered, and the rest of the booking stays intact (P&amp;L-neutral). Link the original sale and its purchase.</>),

    initial: () => ({ date: todayISO(), againstInvoice: '', againstPurchase: '', gstMode: 'intra', party: '', counterParty: '', partialAmount: '', remarks: '' }),

    fromVoucher: (v) => ({
      date: v.date || '', againstInvoice: v.againstInvoice || v.linkNo || '', againstPurchase: v.againstPurchase || '',
      gstMode: v.gstMode || 'intra', party: v.party || '', counterParty: v.counterParty || '',
      partialAmount: v.partialAmount ?? '', remarks: v.remarks || '',
    }),

    toBody: (s, ctx) => {
      const amt = r2(+s.partialAmount || 0);
      return {
        // Stored as a refund (category 'refund') + partialAmount so the backend takes
        // the partial posting path while reusing all the refund plumbing.
        type: 'RF', category: 'refund', branch: ctx.branchCode, date: s.date,
        party: s.party, partyType: 'customer',
        counterParty: s.counterParty, counterPartyGroup: 'Sundry Creditors',
        partialAmount: amt, supplierAmt: amt, lines: [], subtotal: 0, taxAmt: 0,
        gstMode: s.gstMode, gstPct: 0, total: amt,
        againstInvoice: s.againstInvoice, againstPurchase: s.againstPurchase || '', linkNo: s.againstInvoice,
        remarks: s.remarks || `Being partial refund of ${amt}${s.againstInvoice ? ` against ${s.againstInvoice}` : ''}`,
        status: 'saved',
      };
    },

    validate: (s) => {
      const amt = +s.partialAmount || 0;
      let hint = '';
      if (!s.againstInvoice) hint = '(Reference sale invoice)';
      else if (!s.againstPurchase) hint = '(Reference purchase invoice)';
      else if (!s.party) hint = '(Pick customer)';
      else if (!s.counterParty) hint = '(Pick supplier/airline)';
      else if (amt <= 0) hint = '(Enter refund amount)';
      return { ok: !!s.againstInvoice && !!s.againstPurchase && !!s.party && !!s.counterParty && amt > 0, hint };
    },

    fields: (props) => <RefundPartialFields {...props} />,
  };
}

/**
 * ADM (Agent Debit Memo) / ACM (Agent Credit Memo) — independent BSP memos. BSP-only
 * with NO markup and NO Sales/customer involvement: always single-party vs the
 * BSP/airline creditor, posting straight to Direct Expenses (ADM = a cost; ACM = a
 * contra credit). Optional GST on the memo is input/output credit. Gated → PENDING.
 */
function makeAdmAcm(kind) {
  const isAdm = kind === 'adm';
  return {
    type: isAdm ? 'ADM' : 'ACM',
    label: isAdm ? 'ADM Voucher' : 'ACM Voucher',
    icon: isAdm ? '📉' : '📈',
    explain: isAdm
      ? (<><b style={{ color: '#A07828' }}>ADM (Agent Debit Memo):</b> the airline debits the agency via BSP. Booked as <b>ADM Charges (Direct Expenses)</b> vs the airline — BSP-only, no markup, no customer.</>)
      : (<><b style={{ color: '#A07828' }}>ACM (Agent Credit Memo):</b> the airline credits the agency via BSP. Booked as <b>ACM Recovery (Direct Expenses, contra)</b> vs the airline — BSP-only, no markup, no customer.</>),

    initial: () => ({ date: todayISO(), againstInvoice: '', reasonCode: '', counterParty: '', amount: '', gstPct: 0, gstMode: 'intra', remarks: '' }),

    fromVoucher: (v) => ({
      date: v.date || '', againstInvoice: v.againstInvoice || '', reasonCode: v.reasonCode || '',
      counterParty: v.counterParty || '', amount: v.supplierAmt ?? v.subtotal ?? '',
      gstPct: v.gstPct != null && +v.gstPct ? +v.gstPct : 0, gstMode: v.gstMode || 'intra', remarks: v.remarks || '',
    }),

    // ADM/ACM are BSP-only with no markup / no customer — always the absorb shape.
    // The airline memo posts to Direct Expenses (admLines/acmLines) vs the BSP creditor;
    // optional GST on the memo is input (ADM) / output (ACM) credit. total = amount + GST.
    toBody: (s, ctx) => {
      const amount = r2(+s.amount || 0);
      const gstPct = +s.gstPct || 0;
      const taxAmt = r2(amount * gstPct / 100);
      return {
        type: isAdm ? 'ADM' : 'ACM', category: kind, branch: ctx.branchCode, date: s.date,
        reasonCode: s.reasonCode || '',
        counterParty: s.counterParty, counterPartyGroup: 'Sundry Creditors', againstInvoice: s.againstInvoice || '',
        gstMode: taxAmt > 0 ? s.gstMode : '', gstPct,
        subtotal: amount, taxAmt, supplierAmt: amount, total: r2(amount + taxAmt),
        remarks: s.remarks || `Being ${isAdm ? 'Agent Debit' : 'Agent Credit'} Memo${s.reasonCode ? ` (${s.reasonCode})` : ''}`,
        status: 'saved',
      };
    },

    validate: (s) => {
      const amount = +s.amount || 0;
      const hint = !s.counterParty ? '(Pick airline/BSP)' : amount <= 0 ? '(Enter amount)' : '';
      return { ok: !!s.counterParty && amount > 0, hint };
    },

    fields: (props) => <AdmAcmFields {...props} kind={kind} />,
  };
}

export const VOUCHER_REGISTRY = {
  receipt: makeRcptPmt('customer'),
  payment: makeRcptPmt('supplier'),
  refund: makeRefundReissue('refund'),
  reissue: makeRefundReissue('reissue'),
  'refund-partial': makeRefundPartial(),
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
      const all = s.lines || [];
      const lines = all.filter((l) => l.ledger && (+l.amt || 0) !== 0);
      const amtNoLedger = all.some((l) => !l.ledger && (+l.amt || 0) !== 0);
      const ledgerNoAmt = all.some((l) => l.ledger && (+l.amt || 0) === 0);
      // Value test = the GROSS DEBIT (expense/asset legs + input GST). This stays
      // positive even when a credit line (discount/income received) shrinks the taxable
      // base or TDS/rounding pushes `taxable = Dr − Cr` to ≤ 0 — so a balanced, valued
      // voucher (the supplier leg balances it) is never wrongly locked on Save.
      const grossDr = r2(t.drSum + t.gstAmt);
      let hint = '';
      if (!s.party) hint = '(Pick Supplier)';
      else if (!lines.length) hint = amtNoLedger ? '(Pick a ledger on each line)' : ledgerNoAmt ? '(Enter an amount)' : '(Add expense lines)';
      else if (amtNoLedger) hint = '(Pick a ledger on each line)';
      else if (grossDr <= 0) hint = '(Enter an amount)';
      return { ok: !!s.party && lines.length > 0 && !amtNoLedger && grossDr > 0, hint };
    },

    fields: (props) => <PurchaseExpenseFields {...props} />,
  },

  /**
   * Debit Note (DN) — a PURCHASE RETURN to a supplier (the mirror of a purchase):
   *   Dr Supplier (Sundry Creditor)   net        (we owe the supplier less)
   *   Cr Purchase ledger(s)           Σ returns  (cost reversed — default side)
   *   Dr Charge/adjustment ledger(s)  Σ Dr lines (an added charge the supplier keeps)
   *   Cr Input CGST/SGST or IGST      gstAmt     (input credit reversed)
   * Like a journal/purchase voucher, every line carries a per-line Dr/Cr toggle
   * (defaulting to Cr = cost reversed); the backend's debitNoteLines posts each line
   * on its own side and makes the supplier the balancing leg, and the shell shows the
   * live JV effect. GATED → enters PENDING and posts on approval. See
   * posting.builder.debitNoteLines.
   */
  'debit-note': {
    type: 'DN',
    label: 'Debit Note',
    icon: '🔻',
    // Rapid-entry: after a successful save the form closes the confirmation panel and
    // resets to a fresh blank voucher (the save is confirmed by the toast + vno) so the
    // user can immediately enter the next purchase return. See VoucherShell.save().
    closeOnSave: true,
    explain: (<><b style={{ color: '#A07828' }}>Debit Note:</b> a <b>purchase return</b> to a supplier (goods/services sent back, or a supplier over-billing reversed). The <b>supplier (Sundry Creditors) is Debited</b> — we owe them less — and the <b>Purchase ledger(s) and input GST are Credited</b> (the cost is reversed). Each line has a <b>Dr/Cr</b> toggle: returns are <b>Cr</b> by default, switch a line to <b>Dr</b> to book a charge the supplier retains. For cancelling a <b>sale</b>, use Refund / Reissue instead.</>),

    initial: () => ({
      date: todayISO(), billNo: '', party: '',
      remarks: '', lines: [{ _k: 1, ledger: '', drCr: 'Cr', amt: '', desc: '' }, { _k: 2, ledger: '', drCr: 'Dr', amt: '', desc: '' }],
    }),

    fromVoucher: (v) => ({
      date: v.date || '', billNo: v.billNo || v.againstInvoice || '', party: v.party || '',
      remarks: v.remarks || '',
      lines: (v.lines && v.lines.length ? v.lines : [{ ledger: '', drCr: 'Cr', amt: '', desc: '' }, { ledger: '', drCr: 'Dr', amt: '', desc: '' }])
        .map((l, i) => ({ _k: i + 1, ledger: l.ledger || '', drCr: l.drCr === 'Dr' ? 'Dr' : 'Cr', amt: l.amt ?? '', desc: l.desc || '' })),
    }),

    // The line grid is the complete itemisation: input GST is reversed by entering the
    // CGST/SGST/IGST Input ledgers as lines, so we NEVER emit a separate taxAmt — that
    // add-on used to post a second GST leg on top of the tax lines (double-count). The
    // supplier leg balances to the net of the lines (= total).
    toBody: (s, ctx) => {
      const t = dnTotals(s);
      const lines = (s.lines || [])
        .filter((l) => l.ledger && (+l.amt || 0) !== 0)
        .map((l) => ({ ledger: l.ledger, amt: +l.amt || 0, drCr: l.drCr === 'Dr' ? 'Dr' : 'Cr', desc: l.desc || '' }));
      return {
        type: 'DN', category: 'debit-note', branch: ctx.branchCode, date: s.date,
        party: s.party, partyType: 'supplier', billNo: s.billNo, againstInvoice: s.billNo,
        lines, subtotal: t.subtotal, taxAmt: 0, gstMode: '', gstPct: 0, total: t.subtotal,
        remarks: s.remarks || `Being purchase return to ${s.party}${s.billNo ? ` against ${s.billNo}` : ''}`,
        status: 'saved',
      };
    },

    validate: (s) => {
      const t = dnTotals(s);
      const all = s.lines || [];
      // A line "counts" only when it has BOTH a ledger and a non-zero amount. Track the
      // partially-filled rows so the hint tells the user exactly what's missing instead
      // of a vague "add lines" (the cause of the can't-save confusion).
      const lines = all.filter((l) => l.ledger && (+l.amt || 0) !== 0);
      const ledgerNoAmt = all.some((l) => l.ledger && (+l.amt || 0) === 0);
      const amtNoLedger = all.some((l) => !l.ledger && (+l.amt || 0) !== 0);
      // Full Dr/Cr of the lines (input GST is reversed via its own Cr lines). With a
      // supplier party the creditor leg absorbs any imbalance (so the entry always
      // balances); without a party the Dr/Cr lines must balance on their own — a
      // journal-style entry.
      const crTotal = r2(t.crSum);  // Cr returns + input GST reversed (all as lines)
      const drTotal = r2(t.drSum);  // Dr charges / TDS / adjustments
      const selfBalanced = Math.abs(r2(crTotal - drTotal)) < 0.01;
      const gross = Math.max(crTotal, drTotal);
      let hint = '';
      if (!lines.length) {
        if (amtNoLedger) hint = '(Pick a ledger on each line)';
        else if (ledgerNoAmt) hint = '(Enter an amount)';
        else hint = '(Add a line — ledger + amount)';
      } else if (amtNoLedger) hint = '(Pick a ledger on each line)';
      else if (gross <= 0) hint = '(Enter an amount)';
      else if (!s.party && !selfBalanced) hint = '(Pick Supplier or balance Dr = Cr)';
      // Every priced line must have a ledger; need value; and either a party absorbs
      // the balance or the lines self-balance.
      const ok = lines.length > 0 && !amtNoLedger && gross > 0 && (!!s.party || selfBalanced);
      return { ok, hint };
    },

    fields: (props) => <DebitNoteFields {...props} />,
  },
};

export const hasRegistry = (category) => !!VOUCHER_REGISTRY[category];
