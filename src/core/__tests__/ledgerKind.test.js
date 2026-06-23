// liquidityKind() prefers the backend `liquidity` flag and only falls back to a
// NAME regex for older/cached payloads (pre-flag). This is what lets the Cash &
// Liquidity dashboard pick up renamed sub-groups the regex alone would miss.
import { liquidityKind, isCashRow, isBankRow, isLiquidRow } from '../ledgerKind';

describe('liquidityKind — prefers the backend flag', () => {
  test('uses row.liquidity when present, ignoring the group name', () => {
    // group name says "Settlement" (no cash/bank token) but the flag says bank
    expect(liquidityKind({ liquidity: 'bank', group: 'Card Settlement' })).toBe('bank');
    expect(liquidityKind({ liquidity: 'cash', group: 'Petty Drawer' })).toBe('cash');
  });

  test('the flag wins even if the name would suggest otherwise', () => {
    // a ledger named with "bank" but explicitly flagged cash → trust the flag
    expect(liquidityKind({ liquidity: 'cash', group: 'Bank-style Cash Box' })).toBe('cash');
  });
});

describe('liquidityKind — regex fallback when flag absent', () => {
  test('classifies cash / bank / overdraft by name', () => {
    expect(liquidityKind({ group: 'Cash-in-Hand' })).toBe('cash');
    expect(liquidityKind({ group: 'Bank Accounts' })).toBe('bank');
    expect(liquidityKind({ group: 'Bank OD / Overdraft' })).toBe('bank');
  });

  test('non-liquid and empty → ""', () => {
    expect(liquidityKind({ group: 'Sundry Debtors' })).toBe('');
    expect(liquidityKind({ group: '' })).toBe('');
    expect(liquidityKind(null)).toBe('');
  });
});

describe('predicates', () => {
  test('isCashRow / isBankRow / isLiquidRow', () => {
    expect(isCashRow({ liquidity: 'cash' })).toBe(true);
    expect(isBankRow({ liquidity: 'bank' })).toBe(true);
    expect(isLiquidRow({ liquidity: 'bank' })).toBe(true);
    expect(isLiquidRow({ group: 'Sundry Creditors' })).toBe(false);
  });
});
