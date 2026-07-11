// ─── Tally file parsing (client-side) ────────────────────────────────────────
// A FULL Day Book (thousands of vouchers) and a full Trial Balance are exported
// from Tally as Excel / CSV / HTML / XML — never pasted by hand. Everything is
// normalised IN THE BROWSER into the rows the backend already understands:
//   • Day Book → { date, vno, ledger, debit, credit, narration }  (one per leg)
//   • Trial Balance → { ledger, closingDebit, closingCredit }
// File routing mirrors the bank/statement importer; header detection is
// Tally-specific (Particulars = the ledger, Vch No, Dr/Cr, Closing).

const num = (v) => {
  const raw = String(v ?? '');
  const s = raw.replace(/USD|INR|KES|TZS/gi, '').replace(/[₹$,\s]/g, '');
  const paren = /^\(.*\)$/.test(s);
  // Cr/Dr suffix — match it on the space-stripped `s` so BOTH "9000 Cr" and the
  // no-space "9000Cr" are caught (a \bcr\b test on the raw string misses the
  // digit-adjacent no-space form). Fall back to a word-boundary test on the raw.
  const cr = /cr\.?$/i.test(s) || /\bcr\b/i.test(raw);
  const dr = /dr\.?$/i.test(s) || /\bdr\b/i.test(raw);
  const n = Number(s.replace(/[()]/g, '').replace(/[a-z]/gi, ''));
  if (!Number.isFinite(n)) return null;
  const mag = Math.abs(n);
  if (paren || cr) return -mag;
  if (dr) return mag;
  return n; // keep the raw sign
};

/** '14/07/2026', '14-Jul-2026', '2026-07-14', '14.07.26' → 'YYYY-MM-DD' ('' if not a date). */
export function toISODate(v) {
  const s = String(v ?? '').trim();
  if (!s) return '';
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{4})(\d{2})(\d{2})$/); // Tally XML compact YYYYMMDD
  if (m && +m[2] >= 1 && +m[2] <= 12 && +m[3] >= 1 && +m[3] <= 31) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  // DD/MM/YYYY (Tally India). Range-check so a US-style MM/DD ("07/14/2026")
  // doesn't emit the invalid ISO "2026-14-07" — reject it as not-a-date instead.
  if (m && +m[1] >= 1 && +m[1] <= 31 && +m[2] >= 1 && +m[2] <= 12) { const y = m[3].length === 2 ? `20${m[3]}` : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
  const MO = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
  m = s.match(/^(\d{1,2})[ /-]([A-Za-z]{3})[a-z]*[ /-](\d{2,4})$/);
  if (m && MO[m[2].toLowerCase()]) { const y = m[3].length === 2 ? `20${m[3]}` : m[3]; return `${y}-${MO[m[2].toLowerCase()]}-${m[1].padStart(2, '0')}`; }
  return '';
}

// Find the header row anywhere in the first 25 lines, mapping our fields to columns.
function findHeader(matrix, HDR, requireEvery) {
  for (let i = 0; i < Math.min(matrix.length, 25); i++) {
    const row = (matrix[i] || []).map((c) => String(c ?? '').trim());
    const map = {};
    row.forEach((cell, ci) => { for (const [k, re] of Object.entries(HDR)) if (map[k] === undefined && re.test(cell)) map[k] = ci; });
    if (requireEvery.every((k) => map[k] !== undefined)) return { idx: i, cols: map };
  }
  return { idx: -1, cols: null };
}

const DAYBOOK_HDR = {
  date: /^(date|txn\s*date|voucher\s*date)$/i,
  vno: /^(vch\.?\s*no\.?|voucher\s*(no\.?|number)|vch\.?\s*number|ref(erence)?(\s*no\.?)?)$/i,
  ledger: /^(ledger(\s*name)?|particulars|account(\s*name)?|name)$/i,
  debit: /^(debit(\s*amount)?|dr(\s*amount)?)$/i,
  credit: /^(credit(\s*amount)?|cr(\s*amount)?)$/i,
  narration: /^(narration|remarks|description|particulars\s*2|details)$/i,
};

/** Matrix → Day Book rows. Needs Ledger/Particulars + (Debit and/or Credit) columns;
 *  Date and Vch No carry forward across a voucher's multiple ledger legs (Tally
 *  leaves them blank on continuation rows). */
export function normalizeDayBook(matrix = []) {
  const { idx, cols } = findHeader(matrix, DAYBOOK_HDR, ['ledger']);
  if (idx < 0 || (cols.debit === undefined && cols.credit === undefined)) {
    return { rows: [], error: 'No Day Book header found (need a Ledger/Particulars column + Debit/Credit).' };
  }
  const rows = []; let curDate = ''; let curVno = '';
  for (let i = idx + 1; i < matrix.length; i++) {
    const r = matrix[i] || [];
    const d = cols.date !== undefined ? toISODate(r[cols.date]) : '';
    if (d) curDate = d;
    const v = cols.vno !== undefined ? String(r[cols.vno] ?? '').trim() : '';
    if (v) curVno = v;
    // A Tally columnar Day Book prefixes contra legs with "To "/"By " (e.g.
    // "To ICICI Bank A/c") — strip the prefix to recover the real ledger name
    // rather than dropping the leg (which would unbalance the voucher).
    const ledger = String(r[cols.ledger] ?? '').trim().replace(/^(to|by)\s+/i, '');
    if (!ledger || /^(total|grand total|opening balance|closing balance)/i.test(ledger)) continue;
    const debit = cols.debit !== undefined ? Math.abs(num(r[cols.debit]) || 0) : 0;
    const credit = cols.credit !== undefined ? Math.abs(num(r[cols.credit]) || 0) : 0;
    if (!debit && !credit) continue; // a subtotal / narration-only line
    if (!curDate) continue;          // a leg with no voucher date yet — skip noise
    rows.push({ date: curDate, vno: curVno, ledger, debit, credit, narration: cols.narration !== undefined ? String(r[cols.narration] ?? '').trim() : '' });
  }
  return { rows, error: rows.length ? '' : 'Header found but no voucher rows parsed.' };
}

const TB_HDR = {
  ledger: /^(ledger(\s*name)?|particulars|account(\s*name)?|name)$/i,
  closingDebit: /^(closing\s*(debit|dr)|closing\s*balance\s*dr|debit\s*closing)$/i,
  closingCredit: /^(closing\s*(credit|cr)|closing\s*balance\s*cr|credit\s*closing)$/i,
  closing: /^(closing(\s*balance)?|balance)$/i,
  openingDebit: /^(opening\s*(debit|dr))$/i,
  openingCredit: /^(opening\s*(credit|cr))$/i,
  debit: /^(debit|dr)$/i,
  credit: /^(credit|cr)$/i,
};

/** Matrix → Trial Balance rows in the shape importTB understands (a signed
 *  `closing`, or separate closingDebit/closingCredit). Handles a single
 *  Closing column (Dr/Cr suffix) or two closing columns. */
export function normalizeTB(matrix = []) {
  const { idx, cols } = findHeader(matrix, TB_HDR, ['ledger']);
  const hasClose = cols && (cols.closingDebit !== undefined || cols.closingCredit !== undefined || cols.closing !== undefined || cols.debit !== undefined);
  if (idx < 0 || !hasClose) return { rows: [], error: 'No Trial Balance header found (need a Ledger column + a Closing/Debit/Credit column).' };
  const rows = [];
  for (let i = idx + 1; i < matrix.length; i++) {
    const r = matrix[i] || [];
    const ledger = String(r[cols.ledger] ?? '').trim();
    if (!ledger || /^(total|grand total|difference in opening|opening balance)$/i.test(ledger)) continue;
    let row = null;
    if (cols.closingDebit !== undefined || cols.closingCredit !== undefined) {
      row = { ledger, closingDebit: Math.abs(num(r[cols.closingDebit]) || 0), closingCredit: Math.abs(num(r[cols.closingCredit]) || 0) };
    } else if (cols.closing !== undefined) {
      const c = num(r[cols.closing]); if (c === null) continue; row = { ledger, closing: c }; // signed (Cr / parens → negative)
    } else { // opening + movement
      const o = (cols.openingDebit !== undefined ? Math.abs(num(r[cols.openingDebit]) || 0) : 0) - (cols.openingCredit !== undefined ? Math.abs(num(r[cols.openingCredit]) || 0) : 0);
      const dr = Math.abs(num(r[cols.debit]) || 0); const cr = Math.abs(num(r[cols.credit]) || 0);
      row = { ledger, opening: o, debit: dr, credit: cr };
    }
    if (row && (row.closingDebit || row.closingCredit || row.closing || row.debit || row.credit || row.opening)) rows.push(row);
  }
  return { rows, error: rows.length ? '' : 'Header found but no ledger rows parsed.' };
}

// ── File → matrix (CSV / TXT / Excel / HTML) + Tally XML → Day Book ──────────
function splitLine(line, d) {
  const out = []; let cur = ''; let q = false;
  for (const ch of line) { if (ch === '"') q = !q; else if (ch === d && !q) { out.push(cur); cur = ''; } else cur += ch; }
  out.push(cur); return out.map((c) => c.trim().replace(/^"|"$/g, ''));
}
function delimitedToMatrix(text) {
  const lines = String(text).split(/\r?\n/).filter((l) => l.trim() !== '');
  if (!lines.length) return [];
  // Blank out quoted regions before counting delimiters so a comma INSIDE a quoted
  // field (e.g. "Smith, John";1000) doesn't fool the auto-detector. splitLine still
  // honours the quotes when actually splitting.
  const sample = lines.slice(0, 25).join('\n').replace(/"[^"]*"/g, '""');
  const delim = [',', '\t', '|', ';'].map((d) => ({ d, n: (sample.match(new RegExp(`\\${d}`, 'g')) || []).length })).sort((a, b) => b.n - a.n)[0];
  if (!delim.n) return lines.map((l) => [l]);
  return lines.map((l) => splitLine(l, delim.d));
}
function htmlToMatrix(html) {
  const doc = new DOMParser().parseFromString(String(html), 'text/html');
  const tables = [...doc.querySelectorAll('table')];
  if (!tables.length) return [];
  const table = tables.sort((a, b) => b.rows.length - a.rows.length)[0];
  return [...table.rows].map((tr) => [...tr.cells].map((c) => c.textContent.trim()));
}
async function excelToMatrix(arrayBuffer) {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: false });
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' });
}
/** Tally native XML Day Book: each <VOUCHER> carries a date/number + ledger legs
 *  (<ALLLEDGERENTRIES.LIST> with LEDGERNAME + AMOUNT; NEGATIVE amount = debit). */
export function parseTallyXmlDayBook(text) {
  const doc = new DOMParser().parseFromString(String(text), 'application/xml');
  const vouchers = [...doc.querySelectorAll('VOUCHER')];
  if (!vouchers.length) return { rows: [], error: 'No <VOUCHER> elements found in the XML.' };
  const txt = (el, tag) => { const n = el.querySelector(tag); return n ? n.textContent.trim() : ''; };
  const rows = [];
  for (const v of vouchers) {
    const date = toISODate(txt(v, 'DATE'));
    const vno = txt(v, 'VOUCHERNUMBER');
    const narration = txt(v, 'NARRATION');
    for (const e of v.querySelectorAll('ALLLEDGERENTRIES\\.LIST, LEDGERENTRIES\\.LIST')) {
      const ledger = txt(e, 'LEDGERNAME'); if (!ledger) continue;
      const amt = num(txt(e, 'AMOUNT')); if (amt === null || amt === 0) continue;
      rows.push({ date, vno, ledger, debit: amt < 0 ? Math.abs(amt) : 0, credit: amt > 0 ? amt : 0, narration });
    }
  }
  // Base the error on rows we KEPT (dated) — an all-undated file must not read as a
  // silent success with 0 rows.
  const kept = rows.filter((r) => r.date);
  return { rows: kept, error: kept.length ? '' : (rows.length ? 'XML parsed but no dated ledger entries found.' : 'XML parsed but no ledger entries found.') };
}

async function fileToMatrix(file) {
  const name = (file?.name || '').toLowerCase();
  if (/\.(xlsx?|xlsm)$/.test(name)) return excelToMatrix(await file.arrayBuffer());
  const text = await file.text();
  if (/\.(html?|htm)$/.test(name) || /^\s*<(!doctype\s+html|html|table)/i.test(text)) return htmlToMatrix(text);
  return delimitedToMatrix(text);
}
const isXml = (name, text) => /\.xml$/.test(name) || /^\s*<\?xml|<ENVELOPE|<VOUCHER/i.test(text);

/** Pick a Day Book file → normalized voucher rows. XML routes to the Tally parser. */
export async function parseDayBookFile(file) {
  const name = (file?.name || '').toLowerCase();
  if (/\.pdf$/.test(name)) return { rows: [], error: 'PDF can’t be parsed — export the Day Book as Excel / CSV / XML.' };
  if (/\.xml$/.test(name)) return parseTallyXmlDayBook(await file.text());
  if (!/\.(xlsx?|xlsm|html?|htm|csv|txt|tsv)$/.test(name)) {
    const text = await file.text();
    if (isXml(name, text)) return parseTallyXmlDayBook(text);
  }
  return normalizeDayBook(await fileToMatrix(file));
}

/** Pick a Trial Balance file → normalized TB rows (importTB shape). */
export async function parseTBFile(file) {
  const name = (file?.name || '').toLowerCase();
  if (/\.pdf$/.test(name)) return { rows: [], error: 'PDF can’t be parsed — export the Trial Balance as Excel / CSV.' };
  return normalizeTB(await fileToMatrix(file));
}
