// buildSettlement — the pure core behind the AD Dashboard's Receivables/Payables
// "Ageing & Settlement" cards and the AR/AP report tab. Derives the six settlement
// metrics from an ageing() side payload and breaks Unsettled Bills down by fine
// ageing bucket per ledger, guaranteeing the grid's Final Total ties to Unsettled Bills.
import { buildSettlement, FINE_BUCKETS } from '../ArApSettlementView';

// A ledger row with fine buckets that sum to `total`.
const row = (party, a7, a15, a30, a45, a60, a61) => ({ party, a7, a15, a30, a45, a60, a61, total: a7 + a15 + a30 + a45 + a60 + a61 });

describe('buildSettlement — six metrics', () => {
  const totals = { billed: 1000, settled: 800, total: 400, onAccount: 240, net: 160 };
  const rows = [row('Global', 100, 80, 60, 60, 60, 40)]; // sums to 400 = total

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

describe('buildSettlement — ageing grid reconciles to Unsettled Bills', () => {
  test('Final Total equals the Unsettled Bills tile', () => {
    const rows = [row('A', 10, 20, 30, 0, 0, 40), row('B', 0, 0, 10, 20, 30, 40)]; // 100 + 100 = 200
    const { grand, open, reconciled, footer } = buildSettlement('receivable', { billed: 500, total: 200, onAccount: 0 }, rows);
    expect(grand).toBe(200);
    expect(open).toBe(200);
    expect(reconciled).toBe(true);
    // Each bucket column foots to the sum of that column across ledgers.
    expect(footer.a30).toBe(40); // 30 + 10
    expect(footer.a61).toBe(80); // 40 + 40
  });

  test('flags a gap when the ledger rows do not sum to Unsettled Bills', () => {
    const rows = [row('A', 10, 0, 0, 0, 0, 0)]; // sums to 10, but total says 999
    const { reconciled } = buildSettlement('receivable', { total: 999, onAccount: 0 }, rows);
    expect(reconciled).toBe(false);
  });

  test('drops ledgers with no open bills', () => {
    const rows = [row('Open', 50, 0, 0, 0, 0, 0), { party: 'Closed', a7: 0, a15: 0, a30: 0, a45: 0, a60: 0, a61: 0, total: 0 }];
    const { ageRows } = buildSettlement('receivable', { total: 50, onAccount: 0 }, rows);
    expect(ageRows.map((r) => r.party)).toEqual(['Open']);
  });
});

describe('buildSettlement — maxRows Others roll-up (dashboard)', () => {
  test('rolls the tail into an Others row while preserving the reconciled total', () => {
    const rows = [];
    for (let i = 0; i < 8; i++) rows.push(row(`L${i}`, 10, 0, 0, 0, 0, 0)); // 8 ledgers × 10 = 80
    const { ageRows, grand, reconciled } = buildSettlement('receivable', { total: 80, onAccount: 0 }, rows, { maxRows: 3 });
    expect(ageRows).toHaveLength(4);                       // 3 shown + Others
    expect(ageRows[3].party).toBe('Others (5 ledgers)');
    expect(ageRows[3].total).toBe(50);                     // remaining 5 × 10
    expect(grand).toBe(80);                                // still reconciles
    expect(reconciled).toBe(true);
  });

  test('no roll-up when ledger count is within maxRows', () => {
    const rows = [row('A', 10, 0, 0, 0, 0, 0), row('B', 20, 0, 0, 0, 0, 0)];
    const { ageRows } = buildSettlement('receivable', { total: 30, onAccount: 0 }, rows, { maxRows: 6 });
    expect(ageRows).toHaveLength(2);
    expect(ageRows.some((r) => /Others/.test(r.party))).toBe(false);
  });
});

test('FINE_BUCKETS exposes the six labelled columns in order', () => {
  expect(FINE_BUCKETS.map(([, lbl]) => lbl)).toEqual(['0<7', '8<15', '16<30', '31<45', '46<60', '61+']);
});
