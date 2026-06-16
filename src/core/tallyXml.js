// ───────────────────────────────────────────────────────────────────────────
// Tally-compatible XML export — dependency-free, pure functions.
//
// Turns report data (ledger balances OR vouchers) into the same Tally "Import
// Data" ENVELOPE that Tally ERP 9 / Tally Prime accept under
//   Gateway of Tally → Import → XML.
//
// Two shapes are supported (a report supplies whichever it has):
//   • ledger rows  → LEDGER masters carrying a closing balance (trial balance,
//                    P&L, balance sheet, ageing, any name+amount table).
//   • voucher rows → VOUCHER objects with balanced Dr/Cr ledger entries
//                    (day book, sales / purchase register, journals).
//
// Tally sign convention used here: a DEBIT amount is NEGATIVE, a CREDIT amount
// is POSITIVE (this is what Tally's import expects in <AMOUNT> and in a
// ledger's <OPENINGBALANCE>, where a positive figure is a credit balance).
// ───────────────────────────────────────────────────────────────────────────

export const TALLY_DEFAULT_COMPANY = 'Travkings Tours & Travels';

export function escapeXml(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]
  ));
}

const num = (n) => {
  const v = Number(String(n == null ? 0 : n).toString().replace(/[^0-9.-]/g, ''));
  return Number.isFinite(v) ? v : 0;
};

// Round to 2dp without scientific notation; Tally wants plain decimals.
const amt = (n) => {
  const v = Math.round(num(n) * 100) / 100;
  return (Object.is(v, -0) ? 0 : v).toString();
};

function envelope(reportName, company, messages) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- KBiz360 → Tally XML export -->
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>${escapeXml(reportName)}</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(company || TALLY_DEFAULT_COMPANY)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
${messages}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

/**
 * Ledger masters with closing balances — the generic "trial balance" export
 * that fits any name + amount report.
 *
 * @param {object}   opts
 * @param {string}  [opts.company]
 * @param {{name:string, amount:number|string, drCr?:('Dr'|'Cr'|''), parent?:string}[]} opts.rows
 * @returns {string} Tally XML
 */
export function ledgersToTallyXml({ company, rows } = {}) {
  const valid = (rows || []).filter((r) => r && String(r.name || '').trim());
  const messages = valid.map((r) => {
    const balance = num(r.amount);
    // Dr → negative, Cr → positive. If drCr unspecified, take the sign as given
    // but flip so a positive input reads as a (debit) asset/expense balance.
    const signed = r.drCr === 'Cr' ? Math.abs(balance)
      : r.drCr === 'Dr' ? -Math.abs(balance)
        : -balance;
    return `        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="${escapeXml(r.name)}" ACTION="Create">
            <PARENT>${escapeXml(r.parent || 'Suspense A/c')}</PARENT>
            <OPENINGBALANCE>${amt(signed)}</OPENINGBALANCE>
          </LEDGER>
        </TALLYMESSAGE>`;
  }).join('\n');
  return envelope('All Masters', company, messages);
}

/**
 * Voucher export — balanced Dr/Cr entries per voucher.
 *
 * @param {object} opts
 * @param {string} [opts.company]
 * @param {{date:string, vno?:string, vchType?:string, narration?:string,
 *          entries:{ledger:string, amount:number|string, drCr:('Dr'|'Cr')}[]}[]} opts.rows
 * @returns {string} Tally XML
 */
export function vouchersToTallyXml({ company, rows } = {}) {
  const valid = (rows || []).filter((v) => v && Array.isArray(v.entries) && v.entries.length);
  const messages = valid.map((v) => {
    const entries = v.entries
      .filter((e) => e && String(e.ledger || '').trim())
      .map((e) => {
        const isDr = e.drCr === 'Dr';
        const value = isDr ? -Math.abs(num(e.amount)) : Math.abs(num(e.amount));
        return `            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(e.ledger)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>${isDr ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
              <AMOUNT>${amt(value)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`;
      }).join('\n');
    const date = tallyDate(v.date);
    const vchType = escapeXml(v.vchType || 'Journal');
    return `        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="${vchType}" ACTION="Create">
            <DATE>${date}</DATE>
            <EFFECTIVEDATE>${date}</EFFECTIVEDATE>
            <VOUCHERTYPENAME>${vchType}</VOUCHERTYPENAME>
            ${v.vno ? `<VOUCHERNUMBER>${escapeXml(v.vno)}</VOUCHERNUMBER>` : ''}
            ${v.narration ? `<NARRATION>${escapeXml(v.narration)}</NARRATION>` : ''}
${entries}
          </VOUCHER>
        </TALLYMESSAGE>`;
  }).join('\n');
  return envelope('Vouchers', company, messages);
}

// Normalise common date strings (ISO, DD-MMM-YY, DD/MM/YYYY) to Tally's YYYYMMDD.
export function tallyDate(s) {
  if (!s) return '';
  const str = String(s).trim();
  let m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);                 // 2026-03-16
  if (m) return `${m[1]}${m[2]}${m[3]}`;
  const MON = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
  m = str.match(/^(\d{1,2})[-/]([A-Za-z]{3})[-/](\d{2,4})$/);    // 16-Mar-26
  if (m) { const y = m[3].length === 2 ? `20${m[3]}` : m[3]; return `${y}${MON[m[2].toLowerCase()] || '01'}${m[1].padStart(2, '0')}`; }
  m = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);        // 16-03-2026 (DD-MM-YYYY)
  if (m) { const y = m[3].length === 2 ? `20${m[3]}` : m[3]; return `${y}${m[2].padStart(2, '0')}${m[1].padStart(2, '0')}`; }
  return str.replace(/[^0-9]/g, '');
}

/**
 * Read ledger rows out of a rendered report's largest data table — the generic
 * fallback used when a report hasn't supplied structured rows. Takes the first
 * text column as the ledger name and the right-most numeric column as the
 * amount, skipping obvious total/header rows.
 *
 * @param {HTMLElement} root
 * @returns {{name:string, amount:number}[]}
 */
export function scrapeLedgerRows(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  const tables = Array.from(root.querySelectorAll('table'));
  if (!tables.length) return [];
  // pick the table with the most body rows
  const table = tables.map((t) => ({ t, n: t.querySelectorAll('tbody tr, tr').length }))
    .sort((a, b) => b.n - a.n)[0].t;
  const trs = Array.from(table.querySelectorAll('tbody tr'));
  const bodyRows = trs.length ? trs : Array.from(table.querySelectorAll('tr')).slice(1);
  const out = [];
  for (const tr of bodyRows) {
    const cells = Array.from(tr.querySelectorAll('td')).map((td) => (td.textContent || '').trim());
    if (cells.length < 2) continue;
    const name = cells.find((c) => c && !looksNumeric(c));
    if (!name) continue;
    // right-most numeric cell
    let amount = null;
    for (let i = cells.length - 1; i >= 0; i--) {
      if (looksNumeric(cells[i])) { amount = num(cells[i]); break; }
    }
    if (amount == null) continue;
    out.push({ name, amount });
  }
  return out;
}

function looksNumeric(s) {
  const t = String(s).replace(/[₹$€,%\s]/g, '');
  if (!t || t === '-' || t === '—') return false;
  return /^-?\(?\d[\d.]*\)?%?$/.test(t.replace(/[()]/g, ''));
}

// Trigger a browser download of XML text.
export function downloadXml(filename, xml) {
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safe = String(filename || 'tally-export').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-');
  a.download = safe.endsWith('.xml') ? safe : `${safe}.xml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
