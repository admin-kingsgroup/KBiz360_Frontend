// Cash/bank classification for a trial-balance row.
//
// The backend now stamps each trial-balance row with `liquidity` ('cash' | 'bank'
// | ''), resolved by rolling the ledger up to its PRIMARY Tally group. Prefer that
// authoritative flag everywhere. We keep a NAME-based regex fallback only for
// resilience: an older/cached API payload (pre-`liquidity`) still classifies, and
// the app degrades gracefully during a partial deploy. New, renamed sub-groups
// (e.g. "Wallet" under Bank Accounts) are caught by the flag, not the regex.
export function liquidityKind(row) {
  if (!row) return '';
  if (row.liquidity) return row.liquidity; // 'cash' | 'bank'
  const g = row.group || '';
  if (/cash/i.test(g)) return 'cash';
  if (/bank|overdraft/i.test(g)) return 'bank';
  return '';
}

// Convenience predicates.
export const isCashRow = (row) => liquidityKind(row) === 'cash';
export const isBankRow = (row) => liquidityKind(row) === 'bank';
export const isLiquidRow = (row) => liquidityKind(row) !== '';
