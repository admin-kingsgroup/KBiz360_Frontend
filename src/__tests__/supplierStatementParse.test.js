/* Feature 1 — vendor statement paste/CSV parser. */
import { parseSupplierStatement, normDate } from '../core/supplierStatementParse';

describe('normDate', () => {
  test('keeps ISO and zero-pads', () => {
    expect(normDate('2026-5-1')).toBe('2026-05-01');
    expect(normDate('2026-05-01')).toBe('2026-05-01');
  });
  test('converts DD/MM/YYYY and DD-MM-YY', () => {
    expect(normDate('01/05/2026')).toBe('2026-05-01');
    expect(normDate('1-5-26')).toBe('2026-05-01');
  });
});

describe('parseSupplierStatement', () => {
  test('parses CSV rows, skipping header and blanks', () => {
    const text = [
      'date,invoiceNo,debit,credit,description',
      '2026-05-01, INV-77, 1000, 0, May airfare',
      '   ',
      '2026-05-10, , 0, 400, payment received',
    ].join('\n');
    const rows = parseSupplierStatement(text);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ date: '2026-05-01', invoiceNo: 'INV-77', debit: 1000, credit: 0, description: 'May airfare' });
    expect(rows[1]).toEqual({ date: '2026-05-10', invoiceNo: '', debit: 0, credit: 400, description: 'payment received' });
  });

  test('strips currency symbols and thousands separators in amounts', () => {
    const rows = parseSupplierStatement('2026-05-01\tINV-9\t₹1,250.50\t0');
    expect(rows[0].debit).toBe(1250.5);
  });

  test('drops rows with neither debit nor credit', () => {
    const rows = parseSupplierStatement('2026-05-01, INV-1, 0, 0, nothing');
    expect(rows).toHaveLength(0);
  });

  test('handles empty input', () => {
    expect(parseSupplierStatement('')).toEqual([]);
    expect(parseSupplierStatement(undefined)).toEqual([]);
  });
});
