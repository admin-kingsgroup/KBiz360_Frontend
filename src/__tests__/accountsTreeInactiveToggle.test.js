/* Accounts Tree View hides deactivated ledgers by default and reveals them via the
   "Include inactive" toggle. Guards modules/chartBuilder.jsx partitionLedgers —
   the pure split that drives both the visible set and the "N hidden" count. */

// api/crmApi use import.meta (no babel plugin under jest); chartBuilder pulls the
// masters hooks in transitively. partitionLedgers is pure — mock so the module loads.
jest.mock('../core/api', () => ({ apiGet: jest.fn(), apiPost: jest.fn(), apiPut: jest.fn(), apiDelete: jest.fn(), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../core/crmApi', () => ({ crmGet: jest.fn(), crmPost: jest.fn() }));

import { partitionLedgers } from '../modules/chartBuilder.jsx';

const LEDGERS = [
  { id: 1, name: 'Cash', active: true },
  { id: 2, name: 'Sales — Air Tickets', active: false },
  { id: 3, name: 'HDFC Bank' },                       // active flag absent → treated active
  { id: 4, name: 'Purchase — Hotels', active: false },
];

describe('Accounts Tree View — inactive ledger toggle', () => {
  test('default (toggle OFF): deactivated ledgers are dropped and counted as hidden', () => {
    const { sourceLedgers, inactiveHidden } = partitionLedgers(LEDGERS, false);
    expect(sourceLedgers.map((l) => l.id)).toEqual([1, 3]);
    expect(inactiveHidden).toBe(2);
  });

  test('toggle ON: every ledger is included and nothing is reported hidden', () => {
    const { sourceLedgers, inactiveHidden } = partitionLedgers(LEDGERS, true);
    expect(sourceLedgers.map((l) => l.id)).toEqual([1, 2, 3, 4]);
    expect(inactiveHidden).toBe(0);
  });

  test('a ledger with no explicit active flag counts as active (never hidden)', () => {
    const { sourceLedgers, inactiveHidden } = partitionLedgers([{ id: 9, name: 'X' }], false);
    expect(sourceLedgers).toHaveLength(1);
    expect(inactiveHidden).toBe(0);
  });

  test('null / undefined input is safe', () => {
    expect(partitionLedgers(undefined, false)).toEqual({ sourceLedgers: [], inactiveHidden: 0 });
    expect(partitionLedgers(null, true)).toEqual({ sourceLedgers: [], inactiveHidden: 0 });
  });
});
