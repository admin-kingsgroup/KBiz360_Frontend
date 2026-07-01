// buildSettlement — the pure core behind the AD Dashboard's Receivables/Payables
// "Ageing & Settlement" cards and the AR/AP report tab. Derives the six settlement
// metrics and a per-ledger settlement grid (Unsettled Bills · ageing · Unsettled
// Receipt · Final), whose footer reconciles three columns to the matching tabs.
import { buildSettlement, FINE_BUCKETS } from '../ArApSettlementView';

// A ledger row: fine buckets sum to `total` (open bills), with its on-account + net.
const row = (party, buckets, onAccount = 0, net) => {
  const [a7, a15, a30, a45, a60, a61] = buckets;
  const total = a7 + a15 + a30 + a45 + a60 + a61;
  return { party, a7, a15, a30, a45, a60, a61, total, onAccount, net: net == null ? total - onAccount : net };
};

describe('buildSettlement — six metrics', () => {
  const totals = { billed: 1000, settled: 800, total: 400, onAccount: 240, net: 160 };
  const rows = [row('Global', [100, 80, 60, 60, 60, 40], 240, 160)]; // buckets sum 400

  test('maps totals to the six tabs (receivable labels)', () => {
    const { metrics } = buildSettlement('receivable', totals, rows);
    const by = Object.fromEntries(metrics.map((m) => [m.key, m]));
    expect(by.totalBills.value).toBe(1000);          // billed
    expect(by.settledBills.value).toBe(600);         // billed − open
    expect(by.settledRcpt.value).toBe(560);          // settled − onAccount
    expect(by.settledRcpt.label).toBe('Settled Receipt');
    expect(by.unsettledBills.value).toBe(400);       // open
    expect(by.unsettledRcpt.value).toBe(240);        // onAccount
    expect(by.unsettledRcpt.label).toBe('Unsettled Receipt');
    expect(by.final.value).toBe(160);                // net
    expect(by.final.label).toBe('Final Receivables');
  });

  test('payable side flips Receipt→Payment and Final labels', () => {
    const { metrics, isRec } = buildSettlement('payable', totals, rows);
    const by = Object.fromEntries(metrics.map((m) => [m.key, m]));
    expect(isRec).toBe(false);
    expect(by.settledRcpt.label).toBe('Settled Payment');
    expect(by.unsettledRcpt.label).toBe('Unsettled Payment');
    expect(by.final.label).toBe('Final Payables');
  });

  test('derives net when the payload omits it', () => {
    const { metrics } = buildSettlement('receivable', { billed: 500, settled: 300, total: 300, onAccount: 100 }, []);
    expect(metrics.find((m) => m.key === 'final').value).toBe(200); // 300 − 100
  });
});

describe('buildSettlement — per-ledger grid + 3-column reconciliation', () => {
  test('each ledger carries Unsettled / Receipt / Final; footer ties all three to the tabs', () => {
    const rows = [
      row('A', [10, 20, 30, 0, 0, 40], 50, 50),   // unsettled 100, receipt 50, final 50
      row('B', [0, 0, 10, 20, 30, 40], 20, 80),   // unsettled 100, receipt 20, final 80
    ];
    const totals = { billed: 500, total: 200, onAccount: 70, net: 130 };
    const { ageRows, footer, reconciled } = buildSettlement('receivable', totals, rows);
    expect(ageRows[0]).toMatchObject({ party: 'A', unsettled: 100, receipt: 50, final: 50 });
    expect(footer.unsettled).toBe(200);   // → Unsettled Bills tab
    expect(footer.receipt).toBe(70);      // → Unsettled Receipt tab
    expect(footer.final).toBe(130);       // → Final Receivables tab
    expect(footer.a61).toBe(80);          // 40 + 40 (bucket column foots)
    expect(reconciled).toBe(true);
  });

  test('includes an on-account-only ledger (no open bills) so Receipt/Final still reconcile', () => {
    const rows = [
      row('Open',    [50, 0, 0, 0, 0, 0], 0, 50),    // open bills, no advance
      row('Advance', [0, 0, 0, 0, 0, 0], 30, -30),   // advance on account, no open bill
    ];
    const totals = { total: 50, onAccount: 30, net: 20 };
    const { ageRows, footer, reconciled } = buildSettlement('receivable', totals, rows);
    expect(ageRows.map((r) => r.party)).toEqual(['Open', 'Advance']); // both kept
    expect(ageRows[1].final).toBe(-30);   // negative final (advance exceeds open bills)
    expect(footer.unsettled).toBe(50);
    expect(footer.receipt).toBe(30);
    expect(footer.final).toBe(20);
    expect(reconciled).toBe(true);
  });

  test('flags a gap when a footer column does not match its tab', () => {
    const rows = [row('A', [10, 0, 0, 0, 0, 0], 0, 10)];
    const { reconciled } = buildSettlement('receivable', { total: 999, onAccount: 0, net: 999 }, rows);
    expect(reconciled).toBe(false); // unsettled column 10 ≠ open 999
  });

  test('drops ledgers with neither open bills nor on-account', () => {
    const rows = [row('Open', [50, 0, 0, 0, 0, 0], 0, 50), row('Closed', [0, 0, 0, 0, 0, 0], 0, 0)];
    const { ageRows } = buildSettlement('receivable', { total: 50, onAccount: 0, net: 50 }, rows);
    expect(ageRows.map((r) => r.party)).toEqual(['Open']);
  });
});

describe('buildSettlement — maxRows Others roll-up (dashboard)', () => {
  test('rolls the tail into Others, preserving all three reconciled columns', () => {
    const rows = [];
    for (let i = 0; i < 8; i++) rows.push(row(`L${i}`, [10, 0, 0, 0, 0, 0], 5, 5)); // 8 × (u10, r5, f5)
    const totals = { total: 80, onAccount: 40, net: 40 };
    const { ageRows, footer, reconciled } = buildSettlement('receivable', totals, rows, { maxRows: 3 });
    expect(ageRows).toHaveLength(4);                       // 3 shown + Others
    expect(ageRows[3]).toMatchObject({ party: 'Others (5 ledgers)', unsettled: 50, receipt: 25, final: 25 });
    expect(footer.unsettled).toBe(80);
    expect(footer.receipt).toBe(40);
    expect(footer.final).toBe(40);
    expect(reconciled).toBe(true);
  });

  test('no roll-up when ledger count is within maxRows', () => {
    const rows = [row('A', [10, 0, 0, 0, 0, 0], 0, 10), row('B', [20, 0, 0, 0, 0, 0], 0, 20)];
    const { ageRows } = buildSettlement('receivable', { total: 30, onAccount: 0, net: 30 }, rows, { maxRows: 6 });
    expect(ageRows).toHaveLength(2);
    expect(ageRows.some((r) => /Others/.test(r.party))).toBe(false);
  });
});

test('FINE_BUCKETS exposes the six labelled columns in order', () => {
  expect(FINE_BUCKETS.map(([, lbl]) => lbl)).toEqual(['0<7', '8<15', '16<30', '31<45', '46<60', '61+']);
});
