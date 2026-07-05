import { isGroupMode, isEntryHref, gateMenuForGroup } from '../utils/groupMode';

describe('isGroupMode', () => {
  test('ALL string, {code:ALL} → group; a branch/null → not', () => {
    expect(isGroupMode('ALL')).toBe(true);
    expect(isGroupMode({ code: 'ALL' })).toBe(true);
    expect(isGroupMode({ code: 'BOM' })).toBe(false);
    expect(isGroupMode(null)).toBe(false);
  });
});

test('isEntryHref knows the data-entry routes', () => {
  expect(isEntryHref('/receipts')).toBe(true);
  expect(isEntryHref('/journal')).toBe(true);
  expect(isEntryHref('/reports/sreg')).toBe(false);
});

describe('gateMenuForGroup', () => {
  const menu = [
    { label: 'Daily Entry', children: [
      { label: 'Receipt', href: '/receipts' },       // entry — dropped in group
      { label: 'Payment', href: '/payments' },        // entry — dropped
    ] },
    { label: 'Reports', children: [
      { label: 'Sales Register', href: '/reports/sreg' }, // kept
      { label: 'P&L', href: '/reports/pnl' },             // kept
    ] },
    { label: 'Ledger', href: '/ledger' },             // non-entry leaf — kept
  ];

  test('non-group branch → unchanged', () => {
    expect(gateMenuForGroup(menu, { code: 'BOM' })).toBe(menu);
  });

  test('group mode → data-entry leaves removed, empty groups dropped, reports kept', () => {
    const gated = gateMenuForGroup(menu, 'ALL');
    const labels = gated.map((n) => n.label);
    expect(labels).not.toContain('Daily Entry');           // whole group emptied → dropped
    expect(labels).toContain('Reports');
    expect(labels).toContain('Ledger');
    const reports = gated.find((n) => n.label === 'Reports');
    expect(reports.children.map((c) => c.label)).toEqual(['Sales Register', 'P&L']);
  });

  test('a group with a mix keeps its non-entry children', () => {
    const mixed = [{ label: 'Mix', children: [
      { label: 'Pay', href: '/payments' },   // dropped
      { label: 'Day Book', href: '/day-book' }, // kept
    ] }];
    const gated = gateMenuForGroup(mixed, 'ALL');
    expect(gated[0].children.map((c) => c.label)).toEqual(['Day Book']);
  });
});
