// buildSettlement — the pure core behind the AD Dashboard's Receivables/Payables
// "Ageing & Settlement" cards and the AR/AP report tab. Derives the six settlement
// metrics and the per-ledger ageing of Unsettled Bills GROUPED BY SUB-GROUP (each
// group with a subtotal), whose footer reconciles three columns to the tabs.
import { buildSettlement, FINE_BUCKETS } from '../ArApSettlementView';

// A ledger row: fine buckets sum to `total` (open bills), plus on-account, net, sub-group.
const row = (party, buckets, onAccount = 0, net, subGroup = '') => {
  const [a7, a15, a30, a45, a60, a61] = buckets;
  const total = a7 + a15 + a30 + a45 + a60 + a61;
  return { party, subGroup, a7, a15, a30, a45, a60, a61, total, onAccount, net: net == null ? total - onAccount : net };
};
const groupNames = (m) => m.groups.map((g) => g.group);
const grp = (m, name) => m.groups.find((g) => g.group === name);

describe('buildSettlement — six metrics', () => {
  const totals = { billed: 1000, settled: 800, total: 400, onAccount: 240, net: 160 };
  const rows = [row('Global', [100, 80, 60, 60, 60, 40], 240, 160, 'B2B')];

  test('maps totals to the six tabs (receivable labels)', () => {
    const by = Object.fromEntries(buildSettlement('receivable', totals, rows).metrics.map((m) => [m.key, m]));
    expect(by.totalBills.value).toBe(1000);
    expect(by.settledBills.value).toBe(600);
    expect(by.settledRcpt.value).toBe(560);
    expect(by.settledRcpt.label).toBe('Settled Receipt');
    expect(by.unsettledBills.value).toBe(400);
    expect(by.unsettledRcpt.value).toBe(240);
    expect(by.final.value).toBe(160);
    expect(by.final.label).toBe('Final Receivables');
  });

  test('payable side flips Receipt→Payment and Final labels', () => {
    const by = Object.fromEntries(buildSettlement('payable', totals, rows).metrics.map((m) => [m.key, m]));
    expect(by.settledRcpt.label).toBe('Settled Payment');
    expect(by.unsettledRcpt.label).toBe('Unsettled Payment');
    expect(by.final.label).toBe('Final Payables');
  });
});

describe('buildSettlement — grouping by sub-group', () => {
  const rows = [
    row('DELTA',   [0, 0, 0, 0, 0, 40], 10, 30, 'B2B'),
    row('Global',  [10, 20, 30, 0, 0, 0], 20, 40, 'B2B'),
    row('Jignesh', [5, 0, 0, 0, 0, 5], 0, 10, 'B2C Reference'),
    row('WalkIn',  [15, 0, 0, 0, 0, 0], 5, 10, ''),                 // no sub-group → Direct / Others
    row('Legacy',  [8, 0, 0, 0, 0, 0], 0, 8, 'Sundry Debtors'),     // primary head → Direct / Others
  ];
  const totals = { billed: 500, total: 133, onAccount: 35, net: 98 };

  test('buckets ledgers into their sub-groups, folding blank/primary into Direct / Others', () => {
    const m = buildSettlement('receivable', totals, rows);
    expect(groupNames(m)).toContain('B2B');
    expect(groupNames(m)).toContain('B2C Reference');
    expect(groupNames(m)).toContain('Direct / Others');
    expect(grp(m, 'B2B').count).toBe(2);
    expect(grp(m, 'Direct / Others').count).toBe(2); // WalkIn + Legacy
  });

  test('Direct / Others always sorts last; bigger exposure first otherwise', () => {
    const m = buildSettlement('receivable', totals, rows);
    expect(groupNames(m)[groupNames(m).length - 1]).toBe('Direct / Others');
    // B2B (unsettled 100) outranks B2C Reference (unsettled 10)
    expect(groupNames(m).indexOf('B2B')).toBeLessThan(groupNames(m).indexOf('B2C Reference'));
  });

  test('group subtotal sums its ledgers', () => {
    const b2b = grp(buildSettlement('receivable', totals, rows), 'B2B').subtotal;
    expect(b2b.unsettled).toBe(100);  // 40 + 60
    expect(b2b.receipt).toBe(30);     // 10 + 20
    expect(b2b.final).toBe(70);       // 30 + 40
    expect(b2b.a61).toBe(40);         // DELTA's 40
  });

  test('footer reconciles all three columns to the tabs (grand = Σ group subtotals)', () => {
    const { footer, reconciled } = buildSettlement('receivable', totals, rows);
    expect(footer.unsettled).toBe(133);
    expect(footer.receipt).toBe(35);
    expect(footer.final).toBe(98);
    expect(reconciled).toBe(true);
  });
});

describe('buildSettlement — edge cases', () => {
  test('includes an on-account-only ledger (no open bills) so Receipt/Final still reconcile', () => {
    const rows = [
      row('Open',    [50, 0, 0, 0, 0, 0], 0, 50, 'B2B'),
      row('Advance', [0, 0, 0, 0, 0, 0], 30, -30, 'B2B'),   // advance, no open bill
    ];
    const m = buildSettlement('receivable', { total: 50, onAccount: 30, net: 20 }, rows);
    expect(grp(m, 'B2B').count).toBe(2);
    expect(grp(m, 'B2B').subtotal.final).toBe(20);
    expect(m.footer.receipt).toBe(30);
    expect(m.reconciled).toBe(true);
  });

  test('drops ledgers with neither open bills nor on-account', () => {
    const rows = [row('Open', [50, 0, 0, 0, 0, 0], 0, 50, 'B2B'), row('Closed', [0, 0, 0, 0, 0, 0], 0, 0, 'B2B')];
    const m = buildSettlement('receivable', { total: 50, onAccount: 0, net: 50 }, rows);
    expect(grp(m, 'B2B').count).toBe(1);
  });

  test('flags a gap when a footer column does not match its tab', () => {
    const rows = [row('A', [10, 0, 0, 0, 0, 0], 0, 10, 'B2B')];
    expect(buildSettlement('receivable', { total: 999, onAccount: 0, net: 999 }, rows).reconciled).toBe(false);
  });

  test('tolerance scales — sub-rupee drift at crore scale still reconciles', () => {
    const rows = [row('Big', [100000000, 0, 0, 0, 0, 0], 0, 100000000, 'B2B')]; // ₹10 Cr
    // totals drift by 0.40 (accumulated paise) — must NOT flag at this scale
    const m = buildSettlement('receivable', { total: 100000000.4, onAccount: 0, net: 100000000.4 }, rows);
    expect(m.reconciled).toBe(true);
  });

  test('a genuine missing bill still flags regardless of scale', () => {
    const rows = [row('Big', [100000000, 0, 0, 0, 0, 0], 0, 100000000, 'B2B')]; // ₹10 Cr shown
    const m = buildSettlement('receivable', { total: 105000000, onAccount: 0, net: 105000000 }, rows); // ₹50 L missing
    expect(m.reconciled).toBe(false);
  });

  test('no rows → no groups, footer zeroed', () => {
    const m = buildSettlement('receivable', { total: 0, onAccount: 0, net: 0 }, []);
    expect(m.groups).toHaveLength(0);
    expect(m.footer.unsettled).toBe(0);
  });
});

test('FINE_BUCKETS exposes the six labelled columns in order', () => {
  expect(FINE_BUCKETS.map(([, lbl]) => lbl)).toEqual(['0<7', '8<15', '16<30', '31<45', '46<60', '61+']);
});
