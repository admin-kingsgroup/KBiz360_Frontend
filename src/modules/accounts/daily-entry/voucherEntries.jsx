/* ════════════════════════════════════════════════════════════════════
   DAILY ENTRY — RECEIPT / PAYMENT / CONTRA / JOURNAL / PURCHASE-EXPENSE /
   DEBIT NOTE / REFUND-PARTIAL / ADM / ACM VOUCHERS
   All render through the unified VoucherShell (Option C) — CREATE shares
   one form with the ledger-account edit screen. Gated categories
   (refund-partial, debit-note, adm, acm) enter PENDING and post on approval.
   ════════════════════════════════════════════════════════════════════ */

import { VoucherShell } from '../../../core/voucher/VoucherShell';

export function ReceiptVoucher({ branch }) {
  return <VoucherShell category="receipt" mode="create" branch={branch} />;
}

export function PaymentVoucher({ branch }) {
  return <VoucherShell category="payment" mode="create" branch={branch} />;
}

// Contra CREATE renders through the unified VoucherShell (Option C), sharing one
// form with the ledger-account edit screen.
export function ContraVoucher({ branch }) {
  return <VoucherShell category="contra" mode="create" branch={branch} />;
}

// Journal voucher CREATE renders through the unified VoucherShell (Option C), so
// create and the ledger-account edit screen share one form.
export function JournalEntry({ branch }) {
  return <VoucherShell category="journal" mode="create" branch={branch} />;
}

// Purchase-Expense CREATE renders through the unified VoucherShell (Option C),
// sharing one form with the ledger-account edit screen.
export function PurchaseExpenseVoucher({ branch }) {
  return <VoucherShell category="purchase-expense" mode="create" branch={branch} />;
}

// Debit Note CREATE — a purchase return to a supplier. Renders through the unified
// VoucherShell (category 'debit-note', type DN); GATED → enters the approval queue
// and posts the reversal journal (Dr supplier / Cr purchase + input GST) on approval.
export function DebitNoteVoucher({ branch }) {
  return <VoucherShell category="debit-note" mode="create" branch={branch} />;
}

export function RefundPartialVoucher({branch}){ return <VoucherShell category="refund-partial" mode="create" branch={branch} />; }
export function AdmVoucher({branch}){ return <VoucherShell category="adm" mode="create" branch={branch} />; }
export function AcmVoucher({branch}){ return <VoucherShell category="acm" mode="create" branch={branch} />; }
