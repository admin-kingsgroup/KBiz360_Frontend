// Scenario tests for the Tally XML export core: ledger balances, balanced
// vouchers, date normalisation, XML-escaping, and the DOM table-scrape fallback.
import {
  ledgersToTallyXml, vouchersToTallyXml, tallyDate, escapeXml, scrapeLedgerRows,
} from '../tallyXml.js';

describe('escapeXml', () => {
  test('escapes XML-significant characters', () => {
    expect(escapeXml('A & B < C > "D" \'E\'')).toBe('A &amp; B &lt; C &gt; &quot;D&quot; &apos;E&apos;');
  });
  test('handles null/undefined as empty', () => {
    expect(escapeXml(null)).toBe('');
    expect(escapeXml(undefined)).toBe('');
  });
});

describe('tallyDate', () => {
  test('ISO → YYYYMMDD', () => expect(tallyDate('2026-03-16')).toBe('20260316'));
  test('DD-MMM-YY → YYYYMMDD', () => expect(tallyDate('16-Mar-26')).toBe('20260316'));
  test('DD-MM-YYYY → YYYYMMDD', () => expect(tallyDate('16-03-2026')).toBe('20260316'));
  test('empty stays empty', () => expect(tallyDate('')).toBe(''));
});

describe('ledgersToTallyXml', () => {
  test('emits a LEDGER per row with Tally sign convention (Dr negative, Cr positive)', () => {
    const xml = ledgersToTallyXml({
      company: 'Travkings',
      rows: [
        { name: 'Cash', parent: 'Cash-in-Hand', amount: 5000, drCr: 'Dr' },
        { name: 'Sales Account', parent: 'Sales Accounts', amount: 5000, drCr: 'Cr' },
      ],
    });
    expect(xml).toContain('<TALLYREQUEST>Import Data</TALLYREQUEST>');
    expect(xml).toContain('<SVCURRENTCOMPANY>Travkings</SVCURRENTCOMPANY>');
    expect(xml).toContain('<LEDGER NAME="Cash" ACTION="Create">');
    expect(xml).toContain('<PARENT>Cash-in-Hand</PARENT>');
    expect(xml).toContain('<OPENINGBALANCE>-5000</OPENINGBALANCE>'); // Dr → negative
    expect(xml).toContain('<OPENINGBALANCE>5000</OPENINGBALANCE>');   // Cr → positive
  });

  test('skips rows without a name and parses currency-formatted amounts', () => {
    const xml = ledgersToTallyXml({ rows: [
      { name: '', amount: 100 },
      { name: 'Bank', amount: '₹1,234.50', drCr: 'Dr' },
    ] });
    expect((xml.match(/<LEDGER /g) || []).length).toBe(1);
    expect(xml).toContain('<OPENINGBALANCE>-1234.5</OPENINGBALANCE>');
  });

  test('defaults parent to Suspense A/c and company to the entity', () => {
    const xml = ledgersToTallyXml({ rows: [{ name: 'X', amount: 1, drCr: 'Dr' }] });
    expect(xml).toContain('<PARENT>Suspense A/c</PARENT>');
    expect(xml).toContain('Travkings Tours &amp; Travels');
  });
});

describe('vouchersToTallyXml', () => {
  test('builds a balanced Sales voucher with Dr negative / Cr positive amounts', () => {
    const xml = vouchersToTallyXml({ rows: [{
      date: '2026-03-16', vno: 'SV-1', vchType: 'Sales',
      entries: [
        { ledger: 'ACME Travel', amount: 11800, drCr: 'Dr' },
        { ledger: 'Sales Account', amount: 10000, drCr: 'Cr' },
        { ledger: 'Output GST', amount: 1800, drCr: 'Cr' },
      ],
    }] });
    expect(xml).toContain('<VOUCHER VCHTYPE="Sales" ACTION="Create">');
    expect(xml).toContain('<DATE>20260316</DATE>');
    expect(xml).toContain('<VOUCHERNUMBER>SV-1</VOUCHERNUMBER>');
    expect(xml).toContain('<LEDGERNAME>ACME Travel</LEDGERNAME>');
    expect(xml).toContain('<AMOUNT>-11800</AMOUNT>'); // Dr
    expect(xml).toContain('<AMOUNT>10000</AMOUNT>');   // Cr
    expect(xml).toContain('<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>'); // Dr line
    // The three entries net to zero (balanced voucher).
    const amounts = [...xml.matchAll(/<AMOUNT>(-?\d+(?:\.\d+)?)<\/AMOUNT>/g)].map((m) => Number(m[1]));
    expect(amounts.reduce((a, b) => a + b, 0)).toBe(0);
  });

  test('drops vouchers with no entries', () => {
    const xml = vouchersToTallyXml({ rows: [{ date: '2026-01-01', entries: [] }, { date: '2026-01-02', entries: [{ ledger: 'A', amount: 5, drCr: 'Dr' }] }] });
    expect((xml.match(/<VOUCHER /g) || []).length).toBe(1);
  });
});

describe('scrapeLedgerRows (DOM fallback)', () => {
  test('reads name + right-most numeric column from the largest table', () => {
    document.body.innerHTML = `
      <main>
        <table><tbody>
          <tr><td>Cash</td><td>Cash-in-Hand</td><td>₹5,000</td></tr>
          <tr><td>Bank</td><td>Bank Accounts</td><td>₹12,340.50</td></tr>
          <tr><td>Total</td><td></td><td>—</td></tr>
        </tbody></table>
      </main>`;
    const rows = scrapeLedgerRows(document.querySelector('main'));
    expect(rows).toEqual([
      { name: 'Cash', amount: 5000 },
      { name: 'Bank', amount: 12340.5 },
    ]);
  });

  test('returns [] when there is no table', () => {
    document.body.innerHTML = '<main><p>nothing here</p></main>';
    expect(scrapeLedgerRows(document.querySelector('main'))).toEqual([]);
  });
});
