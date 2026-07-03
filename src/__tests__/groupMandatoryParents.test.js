/* Parent Group (level 0) + Group (level 1) are the mandatory chart backbone: fixed,
   never created/edited/deleted. So the Groups master offers ONLY Groups (level 1) as
   the parent for a new node — nesting under a Group creates a Sub-Group. Parent Groups
   and Sub-Groups are not valid parents. Guards mastersLive.validParentGroups. */

jest.mock('../core/api', () => ({ apiGet: jest.fn(), apiPost: jest.fn(), apiPut: jest.fn(), apiDelete: jest.fn(), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../core/crmApi', () => ({ crmGet: jest.fn(), crmPost: jest.fn() }));

import { validParentGroups } from '../modules/masters/mastersLive.jsx';

const GROUPS = [
  { name: 'Sales Accounts', system: true, parent: '' },              // level 0 Parent Group
  { name: 'Current Assets', system: true, parent: '' },              // level 0 Parent Group
  { name: 'Bank Accounts', system: true, parent: 'Current Assets' }, // level 1 (system sub-group = a Group)
  { name: 'Flights', system: false, parent: 'Sales Accounts' },      // level 1 (custom Group)
  { name: 'Domestic Flights', system: false, parent: 'Flights' },    // level 2 Sub-Group
];

describe('validParentGroups — only Groups (level 1) are valid parents', () => {
  test('returns the Group-tier nodes only (system and custom), sorted', () => {
    expect(validParentGroups(GROUPS)).toEqual(['Bank Accounts', 'Flights']);
  });

  test('excludes Parent Groups (level 0) — a new Group cannot be created', () => {
    const res = validParentGroups(GROUPS);
    expect(res).not.toContain('Sales Accounts');
    expect(res).not.toContain('Current Assets');
  });

  test('excludes Sub-Groups (level 2) — no 4th tier', () => {
    expect(validParentGroups(GROUPS)).not.toContain('Domestic Flights');
  });

  test('empty input is safe', () => {
    expect(validParentGroups([])).toEqual([]);
    expect(validParentGroups()).toEqual([]);
  });
});
