// Statement parsing (client-side) — the formats banks actually hand over:
// delimited TXT/CSV (any delimiter), HTML table statements, Dr/Cr vs signed
// amount columns, Indian date formats, running-balance → statement closing.
import { parseDelimited, parseHtmlStatement, normalizeMatrix, toISODate } from '../statementParse';

describe('statement parsing · dates', () => {
  test('Indian bank date formats normalize to ISO', () => {
    expect(toISODate('14/07/2026')).toBe('2026-07-14');
    expect(toISODate('14-07-26')).toBe('2026-07-14');
    expect(toISODate('2026-07-14 00:00')).toBe('2026-07-14');
    expect(toISODate('14-Jul-2026')).toBe('2026-07-14');
    expect(toISODate('TOTAL')).toBe('');
  });
});

describe('statement parsing · delimited (CSV/TXT)', () => {
  test('comma CSV with Debit/Credit + Balance columns, preamble and footer noise', () => {
    const csv = [
      'ICICI BANK LTD',
      'Statement for A/c 0172xxxx from 13/07/2026 to 17/07/2026',
      'Date,Narration,Chq No,Withdrawal Amt.,Deposit Amt.,Balance',
      '14/07/2026,"NEFT CR SUNSHINE, HOLIDAYS",N167221,,510000.00,8935000.00',
      '15/07/2026,BANK CHGS NEFT+GST,,1180.00,,8933820.00',
      'TOTAL,,,1180.00,510000.00,',
    ].join('\n');
    const { rows, statementClosing, error } = parseDelimited(csv);
    expect(error).toBe('');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ date: '2026-07-14', credit: 510000, debit: 0, reference: 'N167221' });
    expect(rows[0].description).toBe('NEFT CR SUNSHINE, HOLIDAYS'); // quoted comma survives
    expect(rows[1]).toMatchObject({ date: '2026-07-15', debit: 1180 });
    expect(statementClosing).toBe(8933820);
  });

  test('pipe-delimited TXT with a signed Amount + Dr/Cr column', () => {
    const txt = [
      'Date|Particulars|Ref|Amount|Dr/Cr',
      '14/07/2026|UPI CR SUNIL|U9|48500|CR',
      '16/07/2026|IMPS TRIPJACK|I5|120000|DR',
    ].join('\n');
    const { rows } = parseDelimited(txt);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ credit: 48500, debit: 0 });
    expect(rows[1]).toMatchObject({ debit: 120000, credit: 0 });
  });

  test('no header → clear error, never silent empty', () => {
    const r = parseDelimited('just,some,cells\n1,2,3');
    expect(r.rows).toHaveLength(0);
    expect(r.error).toMatch(/header/i);
  });
});

describe('statement parsing · HTML (bank HTML statements)', () => {
  test('largest table parsed via DOMParser; ₹ and commas stripped', () => {
    const html = `
      <html><body>
        <table><tr><td>nav</td></tr></table>
        <table>
          <tr><th>Txn Date</th><th>Description</th><th>Ref No.</th><th>Debit</th><th>Credit</th><th>Balance</th></tr>
          <tr><td>14-Jul-2026</td><td>NEFT CR SUNSHINE</td><td>N1</td><td></td><td>₹ 5,10,000.00</td><td>₹ 89,35,000.00</td></tr>
          <tr><td>15-Jul-2026</td><td>CHGS</td><td></td><td>1,180.00</td><td></td><td>89,33,820.00</td></tr>
        </table>
      </body></html>`;
    const { rows, statementClosing, error } = parseHtmlStatement(html);
    expect(error).toBe('');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ date: '2026-07-14', credit: 510000 });
    expect(statementClosing).toBe(8933820);
  });

  test('HTML without a table → clear error', () => {
    expect(parseHtmlStatement('<p>hello</p>').error).toMatch(/table/i);
  });
});

describe('statement parsing · matrix (Excel path shares this)', () => {
  test('negative amount in parentheses; amount-only column signs by value', () => {
    const { rows } = normalizeMatrix([
      ['Date', 'Description', 'Amount'],
      ['14/07/2026', 'CR ITEM', '48500'],
      ['15/07/2026', 'DR ITEM', '(1180)'],
    ]);
    expect(rows[0]).toMatchObject({ credit: 48500, debit: 0 });
    expect(rows[1]).toMatchObject({ debit: 1180, credit: 0 });
  });
});
