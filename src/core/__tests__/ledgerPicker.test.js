// Ledger Account picker — selection/display decoupling (the "Show" button).
// Guards the fix for the desync where picking one ledger (e.g. ICICI Credit Card)
// left the statement showing a stale different ledger (ICICI Bank).
import { resolveLedgerSelection } from '../ledgerPicker';

const ICICI = 'ICICI Bank [A/c.333805003566]';
const CC = 'ICICI Bank Credit Card [4007]';

describe('resolveLedgerSelection — picker state machine', () => {
  test('initial load: nothing picked/shown → falls back to default, panel matches, Show idle', () => {
    const s = resolveLedgerSelection({ pick: '', shown: '', fallback: ICICI });
    expect(s.selected).toBe(ICICI); // dropdown shows the default
    expect(s.display).toBe(ICICI);  // panel shows the same default
    expect(s.dirty).toBe(false);    // nothing to "Show" yet
  });

  test('picking a different ledger arms "Show" but does NOT change the panel yet', () => {
    // User selects the Credit Card; the statement below is still ICICI Bank.
    const s = resolveLedgerSelection({ pick: CC, shown: ICICI, fallback: ICICI });
    expect(s.selected).toBe(CC);    // dropdown reflects the pick
    expect(s.display).toBe(ICICI);  // panel unchanged until Show is pressed
    expect(s.dirty).toBe(true);     // Show enabled
  });

  test('after Show: the picked ledger is what the panel renders, Show goes idle', () => {
    // setShown(CC) committed the pick.
    const s = resolveLedgerSelection({ pick: CC, shown: CC, fallback: ICICI });
    expect(s.selected).toBe(CC);
    expect(s.display).toBe(CC);     // no desync — panel matches the dropdown
    expect(s.dirty).toBe(false);
  });

  test('re-picking the already-shown ledger keeps Show idle (no redundant fetch)', () => {
    const s = resolveLedgerSelection({ pick: ICICI, shown: ICICI, fallback: CC });
    expect(s.dirty).toBe(false);
  });

  test('empty fallback (chart still loading) → nothing selected, Show stays idle', () => {
    const s = resolveLedgerSelection({ pick: '', shown: '', fallback: '' });
    expect(s.selected).toBe('');
    expect(s.display).toBe('');
    expect(s.dirty).toBe(false);
  });

  test('pick survives a fallback change (e.g. lastLedger pref arriving late)', () => {
    // pick takes priority over fallback for `selected`; shown drives `display`.
    const s = resolveLedgerSelection({ pick: CC, shown: '', fallback: ICICI });
    expect(s.selected).toBe(CC);
    expect(s.display).toBe(ICICI); // not yet shown → still the default
    expect(s.dirty).toBe(true);
  });
});
