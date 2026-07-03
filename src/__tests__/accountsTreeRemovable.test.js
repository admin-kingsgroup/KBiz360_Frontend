/* The Accounts Tree View flags a ledger as "Removable" (red — safe to delete) only
   when it's BOTH deactivated AND has zero postings. The backend blocks deleting a
   ledger that has entries, so an inactive ledger WITH entries stays amber, not red.
   Guards modules/chartBuilder.jsx isRemovable. */

jest.mock('../core/api', () => ({ apiGet: jest.fn(), apiPost: jest.fn(), apiPut: jest.fn(), apiDelete: jest.fn(), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../core/crmApi', () => ({ crmGet: jest.fn(), crmPost: jest.fn() }));

import { isRemovable } from '../modules/chartBuilder.jsx';

describe('Accounts Tree View — Removable (red) flag', () => {
  test('inactive + 0 entries → removable', () => {
    expect(isRemovable({ active: false }, 0)).toBe(true);
  });

  test('inactive but has entries → NOT removable (can\'t delete; stays amber)', () => {
    expect(isRemovable({ active: false }, 5)).toBe(false);
  });

  test('active ledger is never removable, even with 0 entries', () => {
    expect(isRemovable({ active: true }, 0)).toBe(false);
    expect(isRemovable({ active: undefined }, 0)).toBe(false); // missing flag = active
  });

  test('missing/undefined entry count is treated as 0 (removable when inactive)', () => {
    expect(isRemovable({ active: false })).toBe(true);
    expect(isRemovable({ active: false }, undefined)).toBe(true);
  });
});
