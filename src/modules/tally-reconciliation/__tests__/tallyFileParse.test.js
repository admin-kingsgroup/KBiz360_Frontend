// Tally file parsing (client-side) — the pure matrix→rows mappers that turn a
// full Day Book / Trial Balance export into the rows the backend understands.
// The Excel path (dynamic import('xlsx')) and file wrappers aren't exercised
// here; the header-detection + normalization + Tally-XML logic is.
import { TextEncoder, TextDecoder } from 'util';
// jsdom in this project doesn't expose the Web TextEncoder/TextDecoder as globals;
// the real browser runtime always does (same footing as DOMParser). Polyfill from
// Node so decodeBuffer's UTF-16 handling can be exercised under jest.
if (typeof global.TextEncoder === 'undefined') global.TextEncoder = TextEncoder;
if (typeof global.TextDecoder === 'undefined') global.TextDecoder = TextDecoder;
import { toISODate, normalizeDayBook, normalizeTB, parseTallyXmlDayBook, parseTallyXmlTB, decodeBuffer } from '../tallyFileParse';

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

  test('an inline Dr/Cr suffix on the amount WINS over the column it sits in', () => {
    // The real Tally "Day Book" display export: each amount cell carries its own
    // "Cr"/"Dr" suffix, and the Debit/Credit headers are shifted so the credits land
    // in the "Debit" column. The suffix is authoritative — a sales credit like
    // "13300.00 Cr" must import as a CREDIT, not silently flip to a debit.
    const matrix = [
      ['Date', 'Particulars', 'Vch No', 'Debit', 'Credit'],
      ['6-Dec-25', 'Travkings Tours and Travels FBM', 'DS/01', '15751.00', ''], // party debit (no suffix → column)
      ['', 'DT-Base Fare', '', '13300.00 Cr', ''],   // credit sitting in the Debit column
      ['', 'DT- Taxes', '', '1234.00 Cr', ''],
      ['', 'Round Off', '', '0.01 Dr', ''],          // genuine debit, suffix agrees
    ];
    const { rows } = normalizeDayBook(matrix);
    expect(rows).toEqual([
      { date: '2025-12-06', vno: 'DS/01', ledger: 'Travkings Tours and Travels FBM', debit: 15751, credit: 0, narration: '' },
      { date: '2025-12-06', vno: 'DS/01', ledger: 'DT-Base Fare', debit: 0, credit: 13300, narration: '' },
      { date: '2025-12-06', vno: 'DS/01', ledger: 'DT- Taxes', debit: 0, credit: 1234, narration: '' },
      { date: '2025-12-06', vno: 'DS/01', ledger: 'Round Off', debit: 0.01, credit: 0, narration: '' },
    ]);
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

  test('Tally terse export: unlabelled ledger column + opening/closing both "Balance"', () => {
    // This is the EXACT header Tally Prime writes: the first (ledger) column has no
    // header text, and BOTH the opening and closing columns are labelled "Balance".
    // The closing is the RIGHTMOST balance column (with a Dr/Cr suffix); the middle
    // Debit/Credit are period movement and must be ignored.
    const matrix = [
      ['', 'Balance', 'Debit', 'Credit', 'Balance'],
      ['Loans (Liability)', '', '', '390700.00', '390700.00 Cr'], // group subtotal → dropped
      ['ND Loan', '', '', '390700.00', '390700.00 Cr'],
      ['Current Assets', '', '250000.00', '', '250000.00 Dr'],    // group subtotal → dropped
      ['Rent', '', '68000.00', '', '68000.00 Dr'],
      ['Grand Total', '', '458700.00', '458700.00', ''],          // total → dropped
    ];
    const { rows, error, note } = normalizeTB(matrix);
    expect(error).toBe('');
    expect(rows).toEqual([
      { ledger: 'ND Loan', closing: -390700 }, // positive Cr → negative signed closing
      { ledger: 'Rent', closing: 68000 },      // Dr → positive
    ]);
    expect(note).toMatch(/group subtotal/i); // grouped export warned about
  });

  test('keeps "Profit & Loss A/c" (a real b/f balance) while dropping true group rows', () => {
    // A monthly Tally TB carries a "Profit & Loss A/c" brought-forward line (the
    // prior-period accumulated P&L). It is NOT a group subtotal — it must survive so
    // it reconciles against the ERP's own P&L b/f.
    const matrix = [
      ['', 'Balance', 'Debit', 'Credit', 'Balance'],
      ['Current Liabilities', '', '68000.00', '68000.00', ''], // group → dropped
      ['ND Loan', '', '', '390700.00', '390700.00 Cr'],        // ledger → kept
      ['Rent', '', '68000.00', '', '68000.00 Dr'],             // P&L ledger → kept (month)
      ['Profit & Loss A/c', '140700.00 Dr', '', '', '140700.00 Dr'], // b/f → KEPT
      ['Grand Total', '', '', '', ''],
    ];
    const { rows } = normalizeTB(matrix);
    const names = rows.map((r) => r.ledger);
    expect(names).toContain('Profit & Loss A/c');
    expect(rows.find((r) => r.ledger === 'Profit & Loss A/c').closing).toBe(140700);
    expect(names).not.toContain('Current Liabilities'); // true group still dropped
  });

  test('reads a Group/Parent column when the export includes it', () => {
    // A grouped TB export with an explicit Group column — carried onto each row so the
    // tie-out can flag a group that differs from ERP (and keep an unmatched Tally
    // ledger out of Suspense).
    const matrix = [
      ['Ledger', 'Group', 'Closing Dr', 'Closing Cr'],
      ['GST Payable (+) / Receivable (-)', 'Duties & Taxes', '13214', '0'],
      ['Professional Tax [F]', 'Duties & Taxes', '0', '200'],
    ];
    const { rows } = normalizeTB(matrix);
    expect(rows).toEqual([
      { ledger: 'GST Payable (+) / Receivable (-)', closingDebit: 13214, closingCredit: 0, group: 'Duties & Taxes' },
      { ledger: 'Professional Tax [F]', closingDebit: 0, closingCredit: 200, group: 'Duties & Taxes' },
    ]);
  });

  test('no Group column → rows keep the exact prior shape (no empty group key)', () => {
    const matrix = [['Ledger', 'Closing Dr', 'Closing Cr'], ['Rent', '68000', '0']];
    expect(normalizeTB(matrix).rows).toEqual([{ ledger: 'Rent', closingDebit: 68000, closingCredit: 0 }]);
  });

  test('keeps a ledger that had ACTIVITY (Debit/Credit) even when Closing nets to ZERO', () => {
    // A ledger with month transactions that net to a 0 closing must NOT vanish; a truly
    // dormant ledger (no activity, no balance) is still dropped. A non-zero closing row
    // keeps its exact prior shape (movement is NOT attached to it).
    const matrix = [
      ['Ledger', 'Debit', 'Credit', 'Closing'],
      ['Active Netted Ledger', '50000', '50000', '0'],   // activity, zero closing → KEEP
      ['Software & Subscription', '46500', '27898.63', '18601.37 Dr'], // has closing → keep, unchanged
      ['Dormant Ledger', '0', '0', '0'],                 // no activity, no balance → drop
    ];
    const { rows } = normalizeTB(matrix);
    const names = rows.map((r) => r.ledger);
    expect(names).toEqual(['Active Netted Ledger', 'Software & Subscription']); // dormant dropped
    expect(rows.find((r) => r.ledger === 'Active Netted Ledger')).toMatchObject({ closing: 0, debit: 50000, credit: 50000 });
    // A row that already has a balance is untouched — no movement attached.
    expect(rows.find((r) => r.ledger === 'Software & Subscription')).toEqual({ ledger: 'Software & Subscription', closing: 18601.37 });
  });

  test('ERP-ledger guard: a listed chart ledger with a blank/dash closing is kept as an explicit zero, not dropped', () => {
    // Akbar is IN the export but its closing cell is blank / a dash, so it parses to no
    // amount. Without the guard the row silently vanishes and the tie-out reads "in ERP,
    // not in Tally"; with the chart set passed in it is kept as closing 0 → an 'off' gap.
    const matrix = [
      ['Ledger', 'Closing Balance'],
      ['Akbar Travels of India (P) Ltd', ' - '],  // dash → no parseable amount
      ['Some Vendor Not In Chart', ''],           // blank, NOT an ERP ledger → still dropped
      ['TRIP JACK Private Limited [Ticketing]', '75679.38 Dr'],
    ];
    const erpLedgers = new Set(['akbar travels of india (p) ltd', 'trip jack private limited [ticketing]']);
    const kept = normalizeTB(matrix, { erpLedgers }).rows;
    expect(kept.map((r) => r.ledger)).toEqual(['Akbar Travels of India (P) Ltd', 'TRIP JACK Private Limited [Ticketing]']);
    expect(kept.find((r) => r.ledger === 'Akbar Travels of India (P) Ltd')).toEqual({ ledger: 'Akbar Travels of India (P) Ltd', closing: 0 });
    // Same file, NO chart set → prior behaviour: the amount-less Akbar row is dropped.
    const withoutGuard = normalizeTB(matrix).rows.map((r) => r.ledger);
    expect(withoutGuard).toEqual(['TRIP JACK Private Limited [Ticketing]']);
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

describe('parseTallyXmlTB', () => {
  // Tally's native Trial Balance XML: <DSPACCNAME><DSPDISPNAME> is the ledger, the
  // sibling <DSPACCINFO> carries the closing in <DSPCLAMTA> (positive = Cr).
  const tbXml = `<ENVELOPE>
    <DSPACCNAME><DSPDISPNAME>Loans (Liability)</DSPDISPNAME></DSPACCNAME>
    <DSPACCINFO><DSPCLAMT><DSPCLAMTA>390700.00</DSPCLAMTA></DSPCLAMT></DSPACCINFO>
    <DSPACCNAME><DSPDISPNAME>ND Loan</DSPDISPNAME></DSPACCNAME>
    <DSPACCINFO><DSPCLAMT><DSPCLAMTA>390700.00</DSPCLAMTA></DSPCLAMT></DSPACCINFO>
    <DSPACCNAME><DSPDISPNAME>Current Assets</DSPDISPNAME></DSPACCNAME>
    <DSPACCINFO><DSPCLAMT><DSPCLAMTA>-250000.00</DSPCLAMTA></DSPCLAMT></DSPACCINFO>
    <DSPACCNAME><DSPDISPNAME>Rent</DSPDISPNAME></DSPACCNAME>
    <DSPACCINFO><DSPCLAMT><DSPCLAMTA>-68000.00</DSPCLAMTA></DSPCLAMT></DSPACCINFO>
    <DSPACCNAME><DSPDISPNAME>Sundry Creditors</DSPDISPNAME></DSPACCNAME>
    <DSPACCINFO><DSPCLAMT><DSPCLAMTA></DSPCLAMTA></DSPCLAMT></DSPACCINFO>
  </ENVELOPE>`;

  test('reads DSPACCNAME/DSPCLAMTA closings (positive = Cr → negative signed) + carries the group header', () => {
    const { rows, error, note } = parseTallyXmlTB(tbXml);
    expect(error).toBe('');
    // Groups (Loans (Liability), Current Assets, Sundry Creditors) are dropped as
    // ledger rows but become the GROUP the following ledgers sit under; the empty
    // closing on Sundry Creditors is skipped regardless.
    expect(rows).toEqual([
      { ledger: 'ND Loan', closing: -390700, group: 'Loans (Liability)' }, // 390700 Cr
      { ledger: 'Rent', closing: 68000, group: 'Current Assets' },         // -68000 → Dr → +68000
    ]);
    expect(note).toMatch(/ledger-wise/i);
  });

  test('errors clearly when the XML is not a Tally TB export', () => {
    const { rows, error } = parseTallyXmlTB('<ENVELOPE><VOUCHER/></ENVELOPE>');
    expect(rows).toHaveLength(0);
    expect(error).toMatch(/not a Tally Trial Balance/i);
  });
});

describe('decodeBuffer (UTF-16 / UTF-8 BOM aware)', () => {
  const enc16le = (s) => { const b = new Uint8Array(2 + s.length * 2); b[0] = 0xff; b[1] = 0xfe; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); b[2 + i * 2] = c & 0xff; b[3 + i * 2] = c >> 8; } return b.buffer; };
  test('decodes a UTF-16LE (BOM) Tally XML the way the browser would NOT', () => {
    const xml = '<ENVELOPE><DSPACCNAME><DSPDISPNAME>ND Loan</DSPDISPNAME></DSPACCNAME></ENVELOPE>';
    const text = decodeBuffer(enc16le(xml));
    expect(text.startsWith('<ENVELOPE>')).toBe(true); // no BOM char, no NUL soup
    expect(text).toContain('ND Loan');
  });
  test('plain UTF-8 passes through unchanged', () => {
    const buf = new TextEncoder().encode('Ledger,Closing\nRent,68000 Dr').buffer;
    expect(decodeBuffer(buf)).toBe('Ledger,Closing\nRent,68000 Dr');
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
