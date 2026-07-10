// ─── Statement parsing (client-side) ─────────────────────────────────────────
// Banks hand over HTML, TXT, Excel and PDF — never a clean API. Everything
// parseable is normalized IN THE BROWSER into rows the backend can match
// format-agnostically (same pattern as the bank-reco import):
//   • CSV / TXT  — delimiter auto-detection (comma / tab / pipe / semicolon)
//   • HTML       — native DOMParser over the statement's <table>
//   • Excel      — SheetJS, lazy-loaded only when an .xls/.xlsx is picked
//   • PDF        — NOT parsed (evidence only; text-PDF templates are Phase 2)
// Output rows: { date: 'YYYY-MM-DD', description, reference, debit, credit }
// plus statementClosing when the file carries a running-balance column.

const HDR = {
  date: /^(txn\s*date|value\s*date|post(ing)?\s*date|date)$/i,
  description: /^(description|narration|particulars|details|transaction\s*(details|remarks)|remarks)$/i,
  reference: /^(ref(erence)?(\s*no\.?)?|cheque\s*(no\.?|number)|chq\.?\s*no\.?|utr(\s*no\.?)?|instrument\s*no\.?)$/i,
  debit: /^(debit|withdrawal(s)?(\s*\(dr\))?|withdrawal\s*amt\.?|dr(\s*amount)?|paid\s*out)$/i,
  credit: /^(credit|deposit(s)?(\s*\(cr\))?|deposit\s*amt\.?|cr(\s*amount)?|paid\s*in)$/i,
  amount: /^(amount|transaction\s*amount|amt\.?)$/i,
  drcr: /^(dr\/?cr|cr\/?dr|type)$/i,
  balance: /^(balance|running\s*balance|closing\s*balance|available\s*balance)$/i,
};

const num = (v) => { // strip currency marks — India books ₹, Africa books $ (USD)
  const n = Number(String(v ?? '').replace(/USD|INR|KES|TZS/gi, '').replace(/[₹$,\s]/g, '').replace(/\((.+)\)/, '-$1'));
  return Number.isFinite(n) ? n : null;
};

/** '14/07/2026', '14-Jul-2026', '2026-07-14', '14.07.26' → 'YYYY-MM-DD' ('' if not a date). */
export function toISODate(v) {
  const s = String(v ?? '').trim();
  if (!s) return '';
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; // Indian bank order: DD/MM/YYYY
  }
  const MONTHS = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
  m = s.match(/^(\d{1,2})[ /-]([A-Za-z]{3})[a-z]*[ /-](\d{2,4})$/);
  if (m && MONTHS[m[2].toLowerCase()]) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${MONTHS[m[2].toLowerCase()]}-${m[1].padStart(2, '0')}`;
  }
  return '';
}

/** Shared: a matrix of cells → normalized rows + statementClosing. Finds the
 *  header row anywhere in the first 25 lines (bank files carry preamble). */
export function normalizeMatrix(matrix = []) {
  let headerIdx = -1; let cols = null;
  for (let i = 0; i < Math.min(matrix.length, 25); i++) {
    const row = (matrix[i] || []).map((c) => String(c ?? '').trim());
    const map = {};
    row.forEach((cell, ci) => {
      for (const [k, re] of Object.entries(HDR)) if (map[k] === undefined && re.test(cell)) map[k] = ci;
    });
    if (map.date !== undefined && (map.amount !== undefined || map.debit !== undefined || map.credit !== undefined)) {
      headerIdx = i; cols = map; break;
    }
  }
  if (headerIdx < 0) return { rows: [], statementClosing: null, error: 'No statement header row found (need Date + Amount or Debit/Credit columns).' };

  const rows = []; let statementClosing = null;
  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const r = matrix[i] || [];
    const date = toISODate(r[cols.date]);
    if (!date) continue; // separators / totals / footer noise
    let debit = cols.debit !== undefined ? Math.abs(num(r[cols.debit]) || 0) : 0;
    let credit = cols.credit !== undefined ? Math.abs(num(r[cols.credit]) || 0) : 0;
    if (!debit && !credit && cols.amount !== undefined) {
      const a = num(r[cols.amount]);
      if (a === null) continue;
      const drcr = cols.drcr !== undefined ? String(r[cols.drcr] || '').toUpperCase() : '';
      const isDr = drcr.startsWith('D') || (!drcr && a < 0);
      if (isDr) debit = Math.abs(a); else credit = Math.abs(a);
    }
    if (!debit && !credit) continue;
    rows.push({
      date,
      description: String(r[cols.description] ?? '').trim(),
      reference: String(r[cols.reference] ?? '').trim(),
      debit, credit,
    });
    if (cols.balance !== undefined) {
      const b = num(r[cols.balance]);
      if (b !== null) statementClosing = b; // last dated row's balance = closing
    }
  }
  return { rows, statementClosing, error: rows.length ? '' : 'Header found but no transaction rows parsed.' };
}

/** CSV / TXT: delimiter auto-detected per file (comma, tab, pipe, semicolon). */
export function parseDelimited(text = '') {
  const lines = String(text).split(/\r?\n/).filter((l) => l.trim() !== '');
  if (!lines.length) return { rows: [], statementClosing: null, error: 'Empty file.' };
  const sample = lines.slice(0, 20).join('\n');
  const delim = [',', '\t', '|', ';'].map((d) => ({ d, n: (sample.match(new RegExp(`\\${d}`, 'g')) || []).length }))
    .sort((a, b) => b.n - a.n)[0];
  if (!delim.n) return { rows: [], statementClosing: null, error: 'No delimiter detected (expected comma / tab / pipe / semicolon).' };
  const matrix = lines.map((line) => splitLine(line, delim.d));
  return normalizeMatrix(matrix);
}
// Quote-aware split (bank CSVs quote narrations containing commas).
function splitLine(line, d) {
  const out = []; let cur = ''; let q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === d && !q) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim().replace(/^"|"$/g, ''));
}

/** HTML statement: the largest <table> in the document, via the native DOMParser. */
export function parseHtmlStatement(html = '') {
  const doc = new DOMParser().parseFromString(String(html), 'text/html');
  const tables = [...doc.querySelectorAll('table')];
  if (!tables.length) return { rows: [], statementClosing: null, error: 'No table found in the HTML statement.' };
  const table = tables.sort((a, b) => b.rows.length - a.rows.length)[0];
  const matrix = [...table.rows].map((tr) => [...tr.cells].map((td) => td.textContent.trim()));
  return normalizeMatrix(matrix);
}

/** Excel (.xls/.xlsx): SheetJS, loaded on demand so it never sits in the main bundle. */
export async function parseExcelStatement(arrayBuffer) {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
  return normalizeMatrix(matrix);
}

/** Route a picked File to the right parser. PDF → { pdf: true } (evidence only). */
export async function parseStatementFile(file) {
  const name = (file?.name || '').toLowerCase();
  if (/\.pdf$/.test(name)) return { rows: [], statementClosing: null, pdf: true, error: '' };
  if (/\.(xlsx?|xlsm)$/.test(name)) return parseExcelStatement(await file.arrayBuffer());
  const text = await file.text();
  if (/\.(html?|htm)$/.test(name) || /^\s*</.test(text)) return parseHtmlStatement(text);
  return parseDelimited(text); // csv / txt / anything delimited
}
