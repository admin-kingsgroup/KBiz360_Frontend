// Ledgers (Chart of Accounts) — Group + cascading Sub-Group list filter.
// api/crmApi use import.meta (no babel plugin under jest); mastersLive pulls them in
// transitively. ledgerMatchesFilter is pure and never calls them — mock so it loads.
jest.mock('../core/api', () => ({ apiGet: jest.fn(), apiPost: jest.fn(), apiPut: jest.fn(), apiDelete: jest.fn(), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../core/crmApi', () => ({ crmGet: jest.fn(), crmPost: jest.fn() }));

import { ledgerMatchesFilter } from '../modules/mastersLive.jsx';

const acme = { name: 'ACME', group: 'Sundry Debtors', subGroup: 'B2B' };
const globe = { name: 'Globe', group: 'Sundry Debtors', subGroup: 'B2C' };
const tbo = { name: 'TBO', group: 'Sundry Creditors', subGroup: '' };

describe('ledgerMatchesFilter — Group + Sub-Group ledger filter', () => {
  test('no group → all ledgers pass (default "All groups")', () => {
    for (const r of [acme, globe, tbo]) expect(ledgerMatchesFilter(r, '', '')).toBe(true);
  });

  test('group only → only ledgers under that group (e.g. Sundry Debtors → debtors)', () => {
    expect(ledgerMatchesFilter(acme, 'Sundry Debtors', '')).toBe(true);
    expect(ledgerMatchesFilter(globe, 'Sundry Debtors', '')).toBe(true);
    expect(ledgerMatchesFilter(tbo, 'Sundry Debtors', '')).toBe(false); // a creditor is excluded
  });

  test('group + sub-group → narrows to that sub-group', () => {
    expect(ledgerMatchesFilter(acme, 'Sundry Debtors', 'B2B')).toBe(true);
    expect(ledgerMatchesFilter(globe, 'Sundry Debtors', 'B2B')).toBe(false); // B2C excluded
  });
});
