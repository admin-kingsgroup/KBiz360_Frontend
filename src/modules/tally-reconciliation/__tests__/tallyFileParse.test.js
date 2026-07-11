// Tally file parsing (client-side) — the pure matrix→rows mappers that turn a
// full Day Book / Trial Balance export into the rows the backend understands.
// The Excel path (dynamic import('xlsx')) and file wrappers aren't exercised
// here; the header-detection + normalization + Tally-XML logic is.
import { toISODate, normalizeDayBook, normalizeTB, parseTallyXmlDayBook } from '../tallyFileParse';

describe('toISODate', () => {
  test('handles the formats Tally prints', () => {
    expect(toISODate('2026-07-14')).toBe('2026-07-14');
    expect(toISODate('14/07/2026')).toBe('2026-07-14');
    expect(toISODate('14-07-26')).toBe('2026-07-14');
    expect(toISODate('14-Jul-2026')).toBe('2026-07-14');
    expect(toISODate('1.4.2026')).toBe('2026-04-01');
    expect(toISODate('20260714')).toBe('2026-07-14'); // Tally compact
    expect(toISODate('07/14/2026')).toBe('');          // US MM/DD — month 14 invalid, rejected not mangled
    expect(toISODate('not a date')).toBe('');
    expect(toISODate('')).toBe('');
  });
});

describe('normalizeDayBook', () => {
  test('carries Date + Vch No forward across a voucher’s ledger legs', () => {
    const matrix = [
      ['Some Company Pvt Ltd'], ['Day Book'], ['1-Jul-2026 to 31-Jul-2026'],
      ['Date', 'Particulars', 'Vch Type', 'Vch No', 'Debit', 'Credit'],
      ['2-Jul-2026', 'ICICI Bank A/c', 'Payment', 'PAY/0412', '200000', ''],
      ['', 'BSP / IATA', '', '', '', '200000'],          // continuation — date+vno blank
      ['15-Jul-2026', 'Global Travels', 'Receipt', 'RCP/0231', '', '100000'],
      ['', 'ICICI Bank A/c', '', '', '100000', ''],
      ['', 'Grand Total', '', '', '300000', '300000'],   // totals line — skipped
    ];
    const { rows, error } = normalizeDayBook(matrix);
    expect(error).toBe('');
    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({ date: '2026-07-02', vno: 'PAY/0412', ledger: 'ICICI Bank A/c', debit: 200000, credit: 0 });
    expect(rows[1]).toMatchObject({ date: '2026-07-02', vno: 'PAY/0412', ledger: 'BSP / IATA', debit: 0, credit: 200000 });
    expect(rows[2]).toMatchObject({ date: '2026-07-15', vno: 'RCP/0231', ledger: 'Global Travels', credit: 100000 });
    expect(rows[3]).toMatchObject({ date: '2026-07-15', vno: 'RCP/0231', ledger: 'ICICI Bank A/c', debit: 100000 });
  });

  test('errors clearly when there is no Ledger/Particulars column', () => {
    const { rows, error } = normalizeDayBook([['Date', 'Amount'], ['2-Jul-2026', '100']]);
    expect(rows).toHaveLength(0);
    expect(error).toMatch(/No Day Book header/);
  });

  test('columnar "To/By" contra legs keep the ledger (prefix stripped, not dropped)', () => {
    const matrix = [
      ['Date', 'Particulars', 'Vch No', 'Debit', 'Credit'],
      ['2-Jul-2026', 'ICICI Bank A/c', 'PAY/1', '', '200000'],  // primary leg (no prefix)
      ['', 'To BSP / IATA', '', '200000', ''],                   // contra leg prefixed "To "
      ['', 'By Rounding', '', '0.5', ''],                        // another contra "By "
      ['', 'Grand Total', '', '200000.5', '200000'],             // summary — still skipped
    ];
    const { rows } = normalizeDayBook(matrix);
    expect(rows.map((r) => r.ledger)).toEqual(['ICICI Bank A/c', 'BSP / IATA', 'Rounding']);
    expect(rows.every((r) => r.date === '2026-07-02' && r.vno === 'PAY/1')).toBe(true);
  });
});

describe('normalizeTB', () => {
  test('two closing columns (Closing Dr / Closing Cr)', () => {
    const matrix = [
      ['Trial Balance'], ['Ledger', 'Opening', 'Debit', 'Credit', 'Closing Dr', 'Closing Cr'],
      ['ICICI Bank A/c', '0', '0', '0', '1245300', '0'],
      ['BSP / IATA', '0', '0', '0', '0', '9000'],
      ['Grand Total', '', '', '', '1245300', '9000'],
    ];
    const { rows } = normalizeTB(matrix);
    expect(rows).toEqual([
      { ledger: 'ICICI Bank A/c', closingDebit: 1245300, closingCredit: 0 },
      { ledger: 'BSP / IATA', closingDebit: 0, closingCredit: 9000 },
    ]);
  });

  test('single signed Closing column (Cr / parentheses / no-space Cr → negative)', () => {
    const matrix = [
      ['Ledger', 'Closing Balance'],
      ['ICICI Bank A/c', '1245300 Dr'],
      ['BSP / IATA', '9000 Cr'],
      ['HDFC Bank A/c', '805000Dr'],  // no space before Dr
      ['Airline Payable', '4200Cr'],  // no space before Cr
      ['Suspense', '(500)'],
    ];
    const { rows } = normalizeTB(matrix);
    expect(rows).toEqual([
      { ledger: 'ICICI Bank A/c', closing: 1245300 },
      { ledger: 'BSP / IATA', closing: -9000 },
      { ledger: 'HDFC Bank A/c', closing: 805000 },
      { ledger: 'Airline Payable', closing: -4200 },
      { ledger: 'Suspense', closing: -500 },
    ]);
  });
});

describe('parseTallyXmlDayBook', () => {
  test('reads <VOUCHER> ledger legs (negative AMOUNT = debit)', () => {
    const xml = `<ENVELOPE><BODY><DATA>
      <VOUCHER><DATE>20260702</DATE><VOUCHERNUMBER>PAY/0412</VOUCHERNUMBER><NARRATION>BSP payment</NARRATION>
        <ALLLEDGERENTRIES.LIST><LEDGERNAME>ICICI Bank A/c</LEDGERNAME><AMOUNT>-200000</AMOUNT></ALLLEDGERENTRIES.LIST>
        <ALLLEDGERENTRIES.LIST><LEDGERNAME>BSP / IATA</LEDGERNAME><AMOUNT>200000</AMOUNT></ALLLEDGERENTRIES.LIST>
      </VOUCHER>
    </DATA></BODY></ENVELOPE>`;
    const { rows, error } = parseTallyXmlDayBook(xml);
    expect(error).toBe('');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ ledger: 'ICICI Bank A/c', debit: 200000, credit: 0, vno: 'PAY/0412' });
    expect(rows[1]).toMatchObject({ ledger: 'BSP / IATA', debit: 0, credit: 200000 });
    expect(rows[0].date).toBe('2026-07-02');
  });

  test('errors when there are no vouchers', () => {
    const { rows, error } = parseTallyXmlDayBook('<ENVELOPE></ENVELOPE>');
    expect(rows).toHaveLength(0);
    expect(error).toMatch(/No <VOUCHER>/);
  });
});
