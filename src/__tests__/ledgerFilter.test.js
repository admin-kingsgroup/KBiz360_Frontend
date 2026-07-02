// Ledgers (Chart of Accounts) — Group + cascading Sub-Group list filter.
// api/crmApi use import.meta (no babel plugin under jest); mastersLive pulls them in
// transitively. ledgerMatchesFilter is pure and never calls them — mock so it loads.
jest.mock('../core/api', () => ({ apiGet: jest.fn(), apiPost: jest.fn(), apiPut: jest.fn(), apiDelete: jest.fn(), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../core/crmApi', () => ({ crmGet: jest.fn(), crmPost: jest.fn() }));

import { ledgerMatchesFilter, validParentGroups } from '../modules/mastersLive.jsx';

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

describe('validParentGroups — 3-tier chart guard (Primary Group ▸ Group ▸ Sub-Group)', () => {
  // Tier 1: system primary. Tier 2: custom under primary. Tier 3: custom under custom.
  const groups = [
    { name: 'Sundry Debtors', system: true, parent: '' },        // Tier 1 (primary)
    { name: 'Current Assets', system: true, parent: '' },        // Tier 1 (primary)
    { name: 'B2C Customers', system: false, parent: 'Sundry Debtors' },   // Tier 2 (group)
    { name: 'Ref Farhan', system: false, parent: 'B2C Customers' },       // Tier 3 (sub-group)
  ];

  test('offers Tier-1 primaries and Tier-2 groups as parents', () => {
    const parents = validParentGroups(groups);
    expect(parents).toContain('Sundry Debtors');   // create a group under a primary
    expect(parents).toContain('Current Assets');
    expect(parents).toContain('B2C Customers');     // create a sub-group under a group
  });

  test('hides Tier-3 sub-groups (nesting under one would make an illegal 4th tier)', () => {
    expect(validParentGroups(groups)).not.toContain('Ref Farhan');
  });

  test('returns names A→Z (numeric-aware) so the parent picker is ordered', () => {
    const parents = validParentGroups(groups);
    expect(parents).toEqual([...parents].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base', numeric: true })));
  });

  test('empty/undefined input is safe', () => {
    expect(validParentGroups()).toEqual([]);
    expect(validParentGroups([])).toEqual([]);
  });
});
