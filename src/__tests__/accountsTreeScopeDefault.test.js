/* Accounts Tree View defaults the Ledger scope to a branch's OWN ledgers when a
   specific branch is in view (Common org-wide ledgers hidden), and to "all" for the
   consolidated view. Guards modules/chartBuilder.jsx defaultScopeFor. */

jest.mock('../core/api', () => ({ apiGet: jest.fn(), apiPost: jest.fn(), apiPut: jest.fn(), apiDelete: jest.fn(), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../core/crmApi', () => ({ crmGet: jest.fn(), crmPost: jest.fn() }));

import { defaultScopeFor } from '../modules/masters/chartBuilder.jsx';

describe('Accounts Tree View — default Ledger scope per Branch view', () => {
  test('a specific branch defaults to its own ledgers only (scope "branch")', () => {
    expect(defaultScopeFor('BOM')).toBe('branch');
    expect(defaultScopeFor('NBO')).toBe('branch');
  });

  test('the consolidated view ("ALL") defaults to "all"', () => {
    expect(defaultScopeFor('ALL')).toBe('all');
  });

  test('empty / undefined branch view falls back to "all"', () => {
    expect(defaultScopeFor('')).toBe('all');
    expect(defaultScopeFor(undefined)).toBe('all');
    expect(defaultScopeFor(null)).toBe('all');
  });
});
