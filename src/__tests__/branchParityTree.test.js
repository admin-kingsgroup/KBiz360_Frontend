/* Travkings Group View — buildParityTree turns the tiered branch-parity payload
   into the nested Parent ▸ Group ▸ Sub ▸ Ledger tree the view renders. Pure, so
   it's unit-tested without rendering. Mirrors accountsTreeInactiveToggle.test.js. */

jest.mock('../core/api', () => ({ apiGet: jest.fn(), apiPost: jest.fn(), apiPut: jest.fn(), apiDelete: jest.fn(), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../core/crmApi', () => ({ crmGet: jest.fn(), crmPost: jest.fn() }));

import { buildParityTree } from '../modules/masters/chartBuilder.jsx';

const PAYLOAD = {
  branches: ['BOM', 'AMD'],
  parentGroups: [{ name: 'Sales Accounts', parent: '', level: 0, star: true, tilde: false, backbone: true, states: ['used', 'dormant'], posts: [12, 0], total: 12, present: 2 }],
  groups: [{ name: 'Domestic Flights', parent: 'Sales Accounts', level: 1, tilde: true, backbone: true, states: ['used', 'dormant'], posts: [12, 0], total: 12, present: 2 }],
  subGroups: [],
  ledgers: [
    { name: 'DT-Base Fare', group: 'Domestic Flights', tilde: true, backbone: true, states: ['used', 'dormant'], posts: [12, 0], total: 12, present: 2 },
    { name: 'Acme Travel', group: 'Sales Accounts', backbone: false, states: ['local', 'absent'], posts: [3, 0], total: 3, present: 1 },
  ],
};

describe('buildParityTree', () => {
  const { roots, branches } = buildParityTree(PAYLOAD);

  test('preserves branch order', () => {
    expect(branches).toEqual(['BOM', 'AMD']);
  });

  test('nests groups under parents and ledgers under their group', () => {
    expect(roots).toHaveLength(1);
    const sales = roots[0];
    expect(sales.name).toBe('Sales Accounts');
    // a ledger attached directly to the parent group + one child group
    const childNames = sales.children.map((c) => c.name);
    expect(childNames).toContain('Domestic Flights');
    expect(childNames).toContain('Acme Travel');
    const flights = sales.children.find((c) => c.name === 'Domestic Flights');
    expect(flights.children.map((c) => c.name)).toEqual(['DT-Base Fare']);
  });

  test('orders group children before ledger children', () => {
    const sales = roots[0];
    expect(sales.children[0].type).toBe('group');   // Domestic Flights before Acme Travel
    expect(sales.children[sales.children.length - 1].type).toBe('ledger');
  });

  test('stamps stable ids, depth and rolled leafCount', () => {
    const sales = roots[0];
    expect(sales.depth).toBe(0);
    expect(sales.id).toMatch(/^p\d+$/);
    expect(sales.leafCount).toBe(2);                // DT-Base Fare + Acme Travel
    const flights = sales.children.find((c) => c.name === 'Domestic Flights');
    expect(flights.depth).toBe(1);
    expect(flights.leafCount).toBe(1);
  });

  test('carries states/posts/sign flags through onto nodes', () => {
    const dt = roots[0].children.find((c) => c.name === 'Domestic Flights').children[0];
    expect(dt.tilde).toBe(true);
    expect(dt.states).toEqual(['used', 'dormant']);
    expect(dt.present).toBe(2);
  });

  test('handles empty / missing payload without throwing', () => {
    expect(buildParityTree(undefined)).toEqual({ roots: [], branches: [] });
    expect(buildParityTree({}).roots).toEqual([]);
  });
});
