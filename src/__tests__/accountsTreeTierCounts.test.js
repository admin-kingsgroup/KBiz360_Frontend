/* The Accounts Tree header summary counts groups by TIER — level 0 = Parent Group,
   level 1 = Group, level 2+ = Sub-Group — matching the tree and the subtitle. (The old
   count folded custom Groups in with Sub-Groups.) Guards chartBuilder.groupTierCounts. */

jest.mock('../core/api', () => ({ apiGet: jest.fn(), apiPost: jest.fn(), apiPut: jest.fn(), apiDelete: jest.fn(), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../core/crmApi', () => ({ crmGet: jest.fn(), crmPost: jest.fn() }));

import { groupTierCounts } from '../modules/chartBuilder.jsx';

describe('groupTierCounts — Parent Group / Group / Sub-Group by level', () => {
  test('splits the three tiers by level', () => {
    const groups = [
      { name: 'Sales Accounts', level: 0 },        // Parent Group
      { name: 'Current Assets', level: 0 },        // Parent Group
      { name: 'Flights', level: 1 },               // Group
      { name: 'Bank Accounts', level: 1 },         // Group
      { name: 'Sundry Debtors', level: 1 },        // Group
      { name: 'Domestic Flights', level: 2 },      // Sub-Group
      { name: 'International Flights', level: 2 },  // Sub-Group
    ];
    expect(groupTierCounts(groups)).toEqual({ parents: 2, groups: 3, subGroups: 2 });
  });

  test('a missing level counts as a Parent Group (level 0)', () => {
    expect(groupTierCounts([{ name: 'X' }])).toEqual({ parents: 1, groups: 0, subGroups: 0 });
  });

  test('level 3+ still counts as a Sub-Group', () => {
    expect(groupTierCounts([{ level: 3 }, { level: 4 }])).toEqual({ parents: 0, groups: 0, subGroups: 2 });
  });

  test('empty / undefined input is safe', () => {
    expect(groupTierCounts([])).toEqual({ parents: 0, groups: 0, subGroups: 0 });
    expect(groupTierCounts()).toEqual({ parents: 0, groups: 0, subGroups: 0 });
  });
});
