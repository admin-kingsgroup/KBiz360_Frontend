// Pure ledger classifier, split out of useReference.js so the voucher-picker
// type rules can be unit-tested in isolation.
//
// Maps a raw /api/ledgers row to the coarse `type` the voucher pickers filter
// on (Bank | Cash | Creditor | Debtor | Tax | Capital | Expense | Asset |
// Liability | Income | Ledger). Classify by GROUP / sub-group first (the
// reliable signal), then fall back to accounting nature.
//
// IMPORTANT — Bank/Cash are BALANCE-SHEET accounts (asset, or liability for an
// OD / credit-card). They are NEVER expense or income. So the name-based
// fallback for "bank"/"cash" must NOT fire for a P&L ledger, otherwise expense
// heads like "Bank Charges Expenses" or "Cash Discount" get mistyped as Bank/
// Cash and vanish from the Payment "Paid to" picker (which excludes Bank/Cash).
export function ledgerType(l) {
  const g = (l.group || '').toLowerCase();
  const n = (l.name || '').toLowerCase();
  const sub = (l.subGroup || '').toLowerCase();
  const isPL = l.nature === 'expense' || l.nature === 'income';
  if (/bank/.test(g) || (!isPL && /bank/.test(n))) return 'Bank';
  if (/cash/.test(g) || (!isPL && /cash/.test(n))) return 'Cash';
  if (/creditor/.test(g) || /supplier/.test(g) || /supplier/.test(sub)) return 'Creditor';
  if (/debtor/.test(g) || /debtor/.test(sub)) return 'Debtor';
  if (/tax/.test(g)) return 'Tax';
  if (/capital/.test(g)) return 'Capital';
  if (l.nature === 'expense') return 'Expense';
  if (l.nature === 'asset') return 'Asset';
  if (l.nature === 'liability') return 'Liability';
  if (l.nature === 'income') return 'Income';
  if (l.drCr === 'Cr') return 'Creditor';
  return 'Ledger';
}
