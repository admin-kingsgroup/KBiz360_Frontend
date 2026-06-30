// Concurrent scenario tests for the pure ledger logic that powers the unified
// ledger UI, the consolidated branch segmentation, and bill-wise ageing.
import {
  billwiseSide, isBillwiseLedger, mapLedger, mapBills,
  groupByBranch, branchSeg, ageingOf, fmt, fmtB, dmy, vtLabel,
} from '../ledgerMath';

const r2 = (n) => Math.round((n || 0) * 100) / 100;

describe('billwiseSide / isBillwiseLedger', () => {
  test.concurrent('debtor group → customer', async () => {
    expect(billwiseSide('Sundry Debtors')).toBe('customer');
    expect(isBillwiseLedger('Sundry Debtors')).toBe(true);
  });
  test.concurrent('creditor group → supplier', async () => {
    expect(billwiseSide('Sundry Creditors')).toBe('supplier');
    expect(isBillwiseLedger('Sundry Creditors')).toBe(true);
  });
  test.concurrent('case-insensitive + substring match', async () => {
    expect(billwiseSide('B2B CUSTOMERS (sundry DEBTOR)')).toBe('customer');
    expect(billwiseSide('Supplier Airlines — Sundry Creditor')).toBe('supplier');
  });
  test.concurrent('non-party groups → null', async () => {
    expect(billwiseSide('Bank Accounts')).toBeNull();
    expect(billwiseSide('Sales Accounts')).toBeNull();
    expect(billwiseSide('')).toBeNull();
    expect(billwiseSide(undefined)).toBeNull();
    expect(isBillwiseLedger('Bank Accounts')).toBe(false);
  });
});

describe('vtLabel', () => {
  test.concurrent('known categories map to friendly labels', async () => {
    expect(vtLabel('sale')).toBe('Sales');
    expect(vtLabel('credit-note')).toBe('Credit Note');
    expect(vtLabel('purchase-expense')).toBe('Purch. Exp');
  });
  test.concurrent('unknown category is title-cased, empty is empty', async () => {
    expect(vtLabel('adjustment')).toBe('Adjustment');
    expect(vtLabel('')).toBe('');
    expect(vtLabel(undefined)).toBe('');
  });
});

describe('mapLedger', () => {
  test.concurrent('null payload → null', async () => {
    expect(mapLedger(null)).toBeNull();
    expect(mapLedger(undefined)).toBeNull();
  });

  test.concurrent('empty ledger → defaults (Dr opening, no rows)', async () => {
    const m = mapLedger({ ledger: 'Cash', group: 'Bank Accounts' });
    expect(m.name).toBe('Cash');
    expect(m.opening).toEqual({ amt: 0, side: 'Dr' });
    expect(m.closing).toEqual({ amt: 0, side: 'Dr' });
    expect(m.rows).toEqual([]);
    expect(m.totalDebit).toBe(0);
  });

  test.concurrent('maps lines: To/By, contra particulars, detail, branch', async () => {
    const m = mapLedger({
      ledger: 'Global Konnection', group: 'Sundry Debtors', code: '1050',
      openingBalance: 5000, openingSide: 'Dr', totalDebit: 22500, totalCredit: 20000,
      closingBalance: 7500, closingSide: 'Dr',
      lines: [
        { date: '05-Apr-26', vno: 'DS/30', voucherId: 'v1', category: 'sale', debit: 22500, credit: 0, branch: 'BOM',
          particulars: [{ ledger: 'Air Ticket Sales', side: 'Cr', amount: 21000 }, { ledger: 'CGST Output', side: 'Cr', amount: 750 }] },
        { date: '12-Apr-26', vno: 'RV/12', voucherId: 'v2', category: 'receipt', debit: 0, credit: 20000, branch: 'BOM',
          particulars: [{ ledger: 'HDFC Bank', side: 'Dr', amount: 20000 }] },
      ],
    });
    expect(m.rows).toHaveLength(2);
    expect(m.rows[0]).toMatchObject({ toBy: 'To', part: 'Air Ticket Sales', vt: 'Sales', dr: 22500, cr: 0, branch: 'BOM' });
    expect(m.rows[0].detail).toEqual([
      { n: 'Air Ticket Sales', side: 'Cr', amt: 21000 },
      { n: 'CGST Output', side: 'Cr', amt: 750 },
    ]);
    expect(m.rows[1]).toMatchObject({ toBy: 'By', part: 'HDFC Bank', vt: 'Receipt' });
  });

  test.concurrent('part falls back to party then category when no particulars', async () => {
    const m = mapLedger({ ledger: 'X', lines: [
      { date: 'd', vno: '1', debit: 100, credit: 0, party: 'ACME', category: 'journal' },
      { date: 'd', vno: '2', debit: 0, credit: 50, category: 'journal' },
    ] });
    expect(m.rows[0].part).toBe('ACME');
    expect(m.rows[1].part).toBe('Journal');
  });

  test.concurrent('carries settlement allocations onto the row (which bills a receipt cleared)', async () => {
    const m = mapLedger({ ledger: 'Global Konnection', group: 'Sundry Debtors', lines: [
      { date: '15-Dec-25', vno: 'RV/BOM/26/0043', category: 'receipt', debit: 0, credit: 36900,
        allocations: [
          { billVno: 'BOM/0626/SF01034', amount: 12300 },
          { billVno: 'BOM/0626/SF01035', amount: 12300 },
          { billVno: 'BOM/0626/SF01036', amount: 12300 },
        ] },
      { date: '08-Dec-25', vno: 'SF01034', category: 'sale', debit: 12300, credit: 0 }, // no allocations → empty
    ] });
    expect(m.rows[0].alloc).toEqual([
      { ref: 'BOM/0626/SF01034', amt: 12300 },
      { ref: 'BOM/0626/SF01035', amt: 12300 },
      { ref: 'BOM/0626/SF01036', amt: 12300 },
    ]);
    expect(m.rows[1].alloc).toEqual([]); // a plain bill carries no settlement chips
  });
});

describe('mapBills', () => {
  test.concurrent('uses outstanding when present', async () => {
    const bills = mapBills({ bills: [{ billVno: 'B1', date: 'd', total: 100, allocated: 30, outstanding: 70, ageDays: 12, status: 'Part' }] });
    expect(bills[0]).toEqual({ ref: 'B1', bdate: 'd', amt: 100, settled: 30, pend: 70, age: 12, status: 'Part' });
  });
  test.concurrent('derives pending = total - allocated when outstanding missing', async () => {
    const bills = mapBills({ bills: [{ billVno: 'B2', total: 100, allocated: 40 }] });
    expect(bills[0].pend).toBe(60);
    expect(bills[0].age).toBe(0);
  });
  test.concurrent('empty / missing → []', async () => {
    expect(mapBills(null)).toEqual([]);
    expect(mapBills({})).toEqual([]);
  });
  test.concurrent('fully-settled bill (statement view) → settled amount, pending 0', async () => {
    const bills = mapBills({ bills: [
      { billVno: 'BOM/0626/SF01034', date: 'd', total: 12300, allocated: 12300, outstanding: 0, status: 'settled' },
    ] });
    expect(bills[0]).toMatchObject({ ref: 'BOM/0626/SF01034', amt: 12300, settled: 12300, pend: 0 });
    // Settled total across the list is non-zero (the bug was this summing to 0).
    expect(bills.reduce((s, b) => s + b.settled, 0)).toBe(12300);
  });
});

describe('groupByBranch + branchSeg', () => {
  test.concurrent('partitions and preserves first-appearance order', async () => {
    const rows = [
      { branch: 'BOM' }, { branch: 'AMD' }, { branch: 'BOM' }, { branch: 'NBO' }, { branch: 'AMD' },
    ];
    const segs = groupByBranch(rows);
    expect(segs.map((s) => s.branch)).toEqual(['BOM', 'AMD', 'NBO']);
    expect(segs[0].rows).toHaveLength(2);
    expect(segs[1].rows).toHaveLength(2);
    expect(segs[2].rows).toHaveLength(1);
  });
  test.concurrent('blank branch buckets under "—" → labelled Unspecified', async () => {
    const segs = groupByBranch([{ branch: '' }, { }]);
    expect(segs).toHaveLength(1);
    expect(segs[0].branch).toBe('—');
    expect(branchSeg(segs[0].branch)).toBe('Unspecified');
  });
  test.concurrent('branchSeg maps ALL/empty to Unspecified, codes pass through', async () => {
    expect(branchSeg('ALL')).toBe('Unspecified');
    expect(branchSeg('')).toBe('Unspecified');
    expect(branchSeg('BOM')).toBe('BOM');
  });
  test.concurrent('empty input → []', async () => {
    expect(groupByBranch([])).toEqual([]);
    expect(groupByBranch(undefined)).toEqual([]);
  });
});

describe('consolidated segmentation reconciles to closing (key invariant)', () => {
  test.concurrent('threaded running balance over branch segments == closing', async () => {
    const d = {
      ledger: 'Global Konnection', group: 'Sundry Debtors',
      openingBalance: 5000, openingSide: 'Dr',
      lines: [
        { date: '1', vno: 'a', debit: 22500, credit: 0, branch: 'BOM' },
        { date: '2', vno: 'b', debit: 14000, credit: 0, branch: 'AMD' },
        { date: '3', vno: 'c', debit: 0, credit: 20000, branch: 'BOM' },
        { date: '4', vno: 'd', debit: 9000, credit: 0, branch: 'NBO' },
        { date: '5', vno: 'e', debit: 0, credit: 5000, branch: 'AMD' },
        { date: '6', vno: 'f', debit: 1000, credit: 0, branch: '' },
      ],
      totalDebit: 46500, totalCredit: 25000,
    };
    const m = mapLedger(d);
    const opSigned = m.opening.side === 'Dr' ? m.opening.amt : -m.opening.amt;
    const segs = groupByBranch(m.rows);
    let bal = opSigned, sumDr = 0, sumCr = 0;
    segs.forEach((g) => g.rows.forEach((row) => { bal = r2(bal + row.dr - row.cr); sumDr += row.dr; sumCr += row.cr; }));
    const closingSigned = r2(opSigned + (m.totalDebit - m.totalCredit));
    expect(r2(sumDr)).toBe(m.totalDebit);
    expect(r2(sumCr)).toBe(m.totalCredit);
    expect(bal).toBe(closingSigned);   // threaded balance ties to consolidated closing
    expect(bal).toBe(26500);           // 5000 + 46500 - 25000
    expect(segs).toHaveLength(4);      // BOM, AMD, NBO, "—"
  });
});

describe('ageingOf', () => {
  test.concurrent('buckets pending by days; ignores settled bills', async () => {
    const { age, totPend } = ageingOf([
      { pend: 1000, age: 0 },    // Not Due
      { pend: 2000, age: 15 },   // 0-30
      { pend: 3000, age: 45 },   // 31-60
      { pend: 4000, age: 75 },   // 61-90
      { pend: 5000, age: 120 },  // 90+
      { pend: 0, age: 200 },     // settled — ignored
      { pend: -10, age: 200 },   // credit balance — ignored
    ]);
    expect(age['Not Due']).toBe(1000);
    expect(age['0-30']).toBe(2000);
    expect(age['31-60']).toBe(3000);
    expect(age['61-90']).toBe(4000);
    expect(age['90+']).toBe(5000);
    expect(totPend).toBe(15000);
  });
  test.concurrent('boundary ages fall in the lower bucket', async () => {
    const { age } = ageingOf([{ pend: 1, age: 30 }, { pend: 1, age: 60 }, { pend: 1, age: 90 }]);
    expect(age['0-30']).toBe(1);
    expect(age['31-60']).toBe(1);
    expect(age['61-90']).toBe(1);
  });
  test.concurrent('empty / undefined → zero buckets', async () => {
    expect(ageingOf([]).totPend).toBe(0);
    expect(ageingOf(undefined).totPend).toBe(0);
  });
});

describe('formatting', () => {
  test.concurrent('fmt: 2dp en-IN; blank for zero/null', async () => {
    expect(fmt(1234567.5)).toBe('12,34,567.50');
    expect(fmt(0)).toBe('');
    expect(fmt(null)).toBe('');
  });
  test.concurrent('fmtB: absolute value, 2dp, 0.00 for empty', async () => {
    expect(fmtB(-2500)).toBe('2,500.00');
    expect(fmtB(0)).toBe('0.00');
    expect(fmtB(null)).toBe('0.00');
  });
  test.concurrent('dmy: ISO → dd-mm-yyyy; passthrough non-ISO; empty', async () => {
    expect(dmy('2026-04-01')).toBe('01-04-2026');
    expect(dmy('2026-06-12T10:00:00Z')).toBe('12-06-2026');
    expect(dmy('')).toBe('');
  });
});
