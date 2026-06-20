/* The 28 fixed backbone groups are presented as two LOCKED, non-editable tiers:
   Primary Group (system, no parent) and Primary Sub Group (system, with parent).
   Custom ERP groups/sub-groups (system:false) are never locked and carry no
   primary tier. Guards core/mastersLive.jsx isPrimaryLocked / primaryTier. */

// api/crmApi use import.meta (no babel plugin under jest); mastersLive pulls them
// in transitively. The helpers under test are pure — mock so the module loads.
jest.mock('../core/api', () => ({ apiGet: jest.fn(), apiPost: jest.fn(), apiPut: jest.fn(), apiDelete: jest.fn(), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../core/crmApi', () => ({ crmGet: jest.fn(), crmPost: jest.fn() }));

import { isPrimaryLocked, primaryTier } from '../modules/mastersLive.jsx';

describe('Primary Group / Primary Sub Group lock + tier', () => {
  test('a system group with no parent is a locked Primary Group', () => {
    const g = { name: 'Current Assets', system: true, parent: '' };
    expect(isPrimaryLocked(g)).toBe(true);
    expect(primaryTier(g)).toBe('Primary Group');
  });

  test('a system group with a parent is a locked Primary Sub Group', () => {
    const g = { name: 'Bank Accounts', system: true, parent: 'Current Assets' };
    expect(isPrimaryLocked(g)).toBe(true);
    expect(primaryTier(g)).toBe('Primary Sub Group');
  });

  test('a custom ERP group/sub-group is never locked and has no primary tier', () => {
    const erpGroup = { name: 'Supplier Air Lines', system: false, parent: 'Sundry Creditors' };
    const erpSub = { name: 'B2C Meta', system: false, parent: 'Sundry Debtors' };
    expect(isPrimaryLocked(erpGroup)).toBe(false);
    expect(primaryTier(erpGroup)).toBe('');
    expect(isPrimaryLocked(erpSub)).toBe(false);
    expect(primaryTier(erpSub)).toBe('');
  });

  test('null / undefined are safe (unlocked, no tier)', () => {
    expect(isPrimaryLocked(undefined)).toBe(false);
    expect(isPrimaryLocked(null)).toBe(false);
    expect(primaryTier(null)).toBe('');
  });
});
