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

describe('validParentGroups — only Groups (level 1) are valid parents (Parent Group + Group mandatory)', () => {
  // Tier 1: Parent Group (system primary). Tier 2: Group (custom under primary).
  // Tier 3: Sub-Group (custom under custom).
  const groups = [
    { name: 'Sundry Debtors', system: true, parent: '' },        // Tier 1 (Parent Group — mandatory)
    { name: 'Current Assets', system: true, parent: '' },        // Tier 1 (Parent Group — mandatory)
    { name: 'B2C Customers', system: false, parent: 'Sundry Debtors' },   // Tier 2 (Group — mandatory, but a valid PARENT)
    { name: 'Ref Farhan', system: false, parent: 'B2C Customers' },       // Tier 3 (Sub-Group)
  ];

  test('offers ONLY Tier-2 Groups as parents — Parent Groups are excluded (no new Group can be created)', () => {
    const parents = validParentGroups(groups);
    expect(parents).toEqual(['B2C Customers']);     // only a Group is a valid parent → creates a Sub-Group
    expect(parents).not.toContain('Sundry Debtors'); // Parent Group is mandatory, not a create-under target
    expect(parents).not.toContain('Current Assets');
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
