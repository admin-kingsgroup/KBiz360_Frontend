// ─── Tally file parsing (client-side) ────────────────────────────────────────
// A FULL Day Book (thousands of vouchers) and a full Trial Balance are exported
// from Tally as Excel / CSV / HTML / XML — never pasted by hand. Everything is
// normalised IN THE BROWSER into the rows the backend already understands:
//   • Day Book → { date, vno, ledger, debit, credit, narration }  (one per leg)
//   • Trial Balance → { ledger, closingDebit, closingCredit }
// File routing mirrors the bank/statement importer; header detection is
// Tally-specific (Particulars = the ledger, Vch No, Dr/Cr, Closing). Tally writes
// its XML as UTF-16LE and its TB with an UNLABELLED ledger column, so the readers
// below are deliberately tolerant of both.

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

// The explicit Dr/Cr a Tally amount cell carries — 'cr' | 'dr' | '' (none). Same
// detection num() uses, exposed so the Day Book can TRUST an inline suffix
// ("13300.00 Cr") over the column an amount happens to sit in: a shifted / mislabelled
// Debit/Credit header, or a single combined amount column, must never flip a credit
// into a debit. A suffix-less number falls back to its column (below).
const crDrSide = (v) => {
  const raw = String(v ?? '');
  const s = raw.replace(/USD|INR|KES|TZS/gi, '').replace(/[₹$,\s]/g, '');
  if (/^\(.*\)$/.test(s) || /cr\.?$/i.test(s) || /\bcr\b/i.test(raw)) return 'cr';
  if (/dr\.?$/i.test(s) || /\bdr\b/i.test(raw)) return 'dr';
  return '';
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

// ── Tally group / total rows (dropped from a TB upload) ──────────────────────
// A grouped Trial Balance print carries GROUP subtotal rows (e.g. "Loans
// (Liability)") interleaved with their ledgers, plus a Grand Total. Importing a
// group row double-counts against the ledger tie-out, so we drop the reserved
// Tally group names — only the compound / parenthesised ones no ledger would ever
// be named (a real ledger "Investments" / "Closing Stock" / "Suspense Account" is
// left ALONE, never silently dropped). The proper fix is a ledger-wise export
// (Tally: F5 on the Trial Balance) — surfaced as a note when a group row is seen.
const TALLY_GROUP_NAMES = new Set([
  'capital account', 'reserves & surplus', 'loans (liability)', 'bank od accounts',
  'secured loans', 'unsecured loans', 'current liabilities', 'duties & taxes',
  'provisions', 'sundry creditors', 'fixed assets', 'current assets', 'bank accounts',
  'cash-in-hand', 'deposits (asset)', 'loans & advances (asset)', 'stock-in-hand',
  'sundry debtors', 'sales accounts', 'direct income', 'purchase accounts',
  'direct expenses', 'indirect expenses', 'indirect income', 'misc. expenses (asset)',
  'branch / divisions',
  // NOTE: 'Profit & Loss A/c' is deliberately NOT here — in a monthly Tally TB it is
  // a real brought-forward balance (the prior-period accumulated P&L) that must
  // reconcile against the ERP's own P&L b/f, not a group subtotal to drop.
]);
const gkey = (s) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const isTallyGroupRow = (name) => TALLY_GROUP_NAMES.has(gkey(name));
const isTBNoiseRow = (name) => /^(grand\s*total|sub[\s-]*total|total|opening\s*balance|closing\s*balance|difference\s*in\s*opening(\s*balance)?)$/i.test(String(name ?? '').trim());

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
    // Amount → Dr/Cr. A Tally Day Book cell usually carries its OWN "Dr"/"Cr" suffix
    // ("13300.00 Cr"); when it does, that suffix is AUTHORITATIVE — a shifted or
    // mislabelled Debit/Credit header, or a single combined amount column, must never
    // flip a credit into a debit (the bug that read every DT-Base Fare sale as a Dr).
    // Only a suffix-less number is bucketed by the column it sits in.
    let debit = 0; let credit = 0;
    for (const [ci, col] of [[cols.debit, 'debit'], [cols.credit, 'credit']]) {
      if (ci === undefined) continue;
      const mag = Math.abs(num(r[ci]) || 0);
      if (!mag) continue;
      const side = crDrSide(r[ci]);
      if (side ? side === 'cr' : col === 'credit') credit += mag; else debit += mag;
    }
    if (!debit && !credit) continue; // a subtotal / narration-only line
    if (!curDate) continue;          // a leg with no voucher date yet — skip noise
    rows.push({ date: curDate, vno: curVno, ledger, debit, credit, narration: cols.narration !== undefined ? String(r[cols.narration] ?? '').trim() : '' });
  }
  return { rows, error: rows.length ? '' : 'Header found but no voucher rows parsed.' };
}

// ── Trial Balance columnar header (Excel / CSV / HTML) ────────────────────────
// Tally's TB print is terse: the ledger column has NO header text, and BOTH the
// opening and closing columns are labelled just "Balance". So we classify columns
// row-by-row and (a) infer the ledger column when it's blank, (b) treat the
// RIGHTMOST balance/closing column as the closing (the left "Balance" is opening).
const TB_COLS = [
  ['closingDebit', /^(closing\s*(debit|dr)|closing\s*balance\s*(debit|dr)|debit\s*closing)$/i],
  ['closingCredit', /^(closing\s*(credit|cr)|closing\s*balance\s*(credit|cr)|credit\s*closing)$/i],
  ['closing', /^closing(\s*balance)?$/i],
  ['openingDebit', /^(opening\s*(debit|dr)|opening\s*balance\s*(debit|dr))$/i],
  ['openingCredit', /^(opening\s*(credit|cr)|opening\s*balance\s*(credit|cr))$/i],
  ['opening', /^opening(\s*balance)?$/i],
  ['debit', /^(debit|dr)(\s*amount)?$/i],
  ['credit', /^(credit|cr)(\s*amount)?$/i],
];
const TB_LEDGER = /^(ledger(\s*name)?|particulars|account(\s*name)?|name)$/i;
// Tally's TB can carry the ledger's GROUP when exported with it shown (F12 → Parent).
// Reading it lets the tie-out flag a group that differs from ERP (and stops an
// unmatched Tally ledger falling into Suspense). Not an amount column.
const TB_GROUP = /^(group(\s*name)?|under|parent(\s*group)?|primary\s*group)$/i;
const TB_BALANCE = /^balance$/i; // bare "Balance" — Tally uses it for opening AND closing

function classifyTBHeaderRow(row = []) {
  const cols = {};
  const balances = [];
  let amtMatches = 0;
  row.forEach((cell, i) => {
    const c = String(cell ?? '').trim();
    if (!c) return;
    if (cols.ledger === undefined && TB_LEDGER.test(c)) { cols.ledger = i; return; }
    if (cols.group === undefined && TB_GROUP.test(c)) { cols.group = i; return; }
    if (TB_BALANCE.test(c)) { balances.push(i); amtMatches += 1; return; }
    for (const [k, re] of TB_COLS) if (re.test(c)) { if (cols[k] === undefined) cols[k] = i; amtMatches += 1; break; }
  });
  // Resolve bare "Balance" columns → closing (rightmost) / opening (an earlier one),
  // unless an explicit closing/opening column was already labelled.
  if (balances.length) {
    if (cols.closing === undefined && cols.closingDebit === undefined && cols.closingCredit === undefined) cols.closing = balances[balances.length - 1];
    if (cols.opening === undefined && cols.openingDebit === undefined && cols.openingCredit === undefined && balances.length > 1) cols.opening = balances[0];
  }
  return { cols, amtMatches };
}

function findTBHeader(matrix) {
  let best = null;
  for (let i = 0; i < Math.min(matrix.length, 25); i++) {
    const { cols, amtMatches } = classifyTBHeaderRow(matrix[i] || []);
    const hasClose = cols.closingDebit !== undefined || cols.closingCredit !== undefined || cols.closing !== undefined || cols.debit !== undefined;
    // The header must carry at least one closing/debit column. Prefer the row with
    // the MOST amount columns so a stray "Balance" in a preamble line never wins.
    if (hasClose && (!best || amtMatches > best.amtMatches)) best = { idx: i, cols, amtMatches };
  }
  if (!best) return { idx: -1, cols: null };
  // Ledger column unlabelled (Tally leaves it blank) → the first column not already
  // claimed by an amount column, defaulting to 0.
  if (best.cols.ledger === undefined) {
    const used = new Set(Object.entries(best.cols).filter(([k]) => k !== 'ledger').map(([, v]) => v));
    let li = 0; while (used.has(li)) li += 1;
    best.cols.ledger = li;
  }
  return best;
}

/** Matrix → Trial Balance rows in the shape importTB understands (a signed
 *  `closing`, or separate closingDebit/closingCredit). Handles a single Closing
 *  column (Dr/Cr suffix), two closing columns, or Tally's terse opening/closing
 *  "Balance" pair with an unlabelled ledger column. Group subtotals are dropped. */
export function normalizeTB(matrix = []) {
  const { idx, cols } = findTBHeader(matrix);
  if (idx < 0 || !cols) return { rows: [], error: 'No Trial Balance header found (need a Ledger column + a Closing/Debit/Credit column).' };
  const rows = [];
  let droppedGroups = 0;
  for (let i = idx + 1; i < matrix.length; i++) {
    const r = matrix[i] || [];
    const ledger = String(r[cols.ledger] ?? '').trim();
    if (!ledger || isTBNoiseRow(ledger)) continue;
    if (isTallyGroupRow(ledger)) { droppedGroups += 1; continue; }
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
    // Carry the Tally group when the export included it (only when non-empty, so a
    // group-less export keeps the exact prior row shape).
    if (row && cols.group !== undefined) { const g = String(r[cols.group] ?? '').trim(); if (g) row.group = g; }
    // Keep a ledger that had ACTIVITY (Debit/Credit movement) even when its balance nets
    // to ZERO — otherwise an all-zero-closing row is dropped below and a ledger that had
    // real transactions this month silently vanishes from the reconciliation. Only a row
    // with NO balance reads its movement columns (so non-zero rows keep their exact prior
    // shape); a closing-only export that carries no movement still can't tell these apart
    // from truly dormant ledgers, and those stay dropped.
    if (row && !(row.closingDebit || row.closingCredit || row.closing || row.opening)) {
      if (row.debit === undefined && cols.debit !== undefined) { const dr = Math.abs(num(r[cols.debit]) || 0); if (dr) row.debit = dr; }
      if (row.credit === undefined && cols.credit !== undefined) { const cr = Math.abs(num(r[cols.credit]) || 0); if (cr) row.credit = cr; }
    }
    if (row && (row.closingDebit || row.closingCredit || row.closing || row.debit || row.credit || row.opening)) rows.push(row);
  }
  return { rows, error: rows.length ? '' : 'Header found but no ledger rows parsed.', note: groupedNote(droppedGroups) };
}

const groupedNote = (n) => (n ? `Skipped ${n} group subtotal row${n > 1 ? 's' : ''}. For the cleanest tie-out, export the Trial Balance ledger-wise (in Tally, press F5 on the Trial Balance) so group totals don't double-count.` : '');

// ── File → matrix (CSV / TXT / Excel / HTML) + Tally XML → Day Book / TB ──────
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

/** Decode a file's bytes to text, honouring a UTF-16/UTF-8 BOM. Tally writes its
 *  XML as UTF-16LE, which the browser's File.text() (always UTF-8) would mojibake
 *  into an unparseable soup — hence reading the ArrayBuffer and picking the codec. */
export function decodeBuffer(buf) {
  const b = new Uint8Array(buf);
  let enc = 'utf-8';
  if (b.length >= 2 && b[0] === 0xff && b[1] === 0xfe) enc = 'utf-16le';
  else if (b.length >= 2 && b[0] === 0xfe && b[1] === 0xff) enc = 'utf-16be';
  else if (b.length >= 3 && b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) enc = 'utf-8';
  else if (b.length >= 4 && b[1] === 0x00 && b[3] === 0x00) enc = 'utf-16le'; // BOM-less UTF-16LE (ASCII payload)
  else if (b.length >= 4 && b[0] === 0x00 && b[2] === 0x00) enc = 'utf-16be';
  let out;
  try { out = new TextDecoder(enc).decode(buf); }
  catch { out = new TextDecoder('utf-8').decode(buf); }
  return out.replace(/^﻿/, ''); // strip any residual BOM char so DOMParser sees a clean root
}
const readText = async (file) => decodeBuffer(await file.arrayBuffer());

async function fileToMatrix(file) {
  const name = (file?.name || '').toLowerCase();
  if (/\.(xlsx?|xlsm)$/.test(name)) return excelToMatrix(await file.arrayBuffer());
  const text = await readText(file);
  if (/\.(html?|htm)$/.test(name) || /^\s*<(!doctype\s+html|html|table)/i.test(text)) return htmlToMatrix(text);
  return delimitedToMatrix(text);
}
/** Tally native XML Day Book: each <VOUCHER> carries a date/number + ledger legs
 *  (<ALLLEDGERENTRIES.LIST> / <LEDGERENTRIES.LIST> with LEDGERNAME + AMOUNT;
 *  NEGATIVE amount = debit). Deleted/cancelled vouchers are skipped. */
export function parseTallyXmlDayBook(text) {
  const doc = new DOMParser().parseFromString(String(text), 'application/xml');
  const vouchers = [...doc.querySelectorAll('VOUCHER')];
  if (!vouchers.length) return { rows: [], error: 'No <VOUCHER> elements found in the XML.' };
  const txt = (el, tag) => { const n = el.querySelector(tag); return n ? n.textContent.trim() : ''; };
  const yes = (el, tag) => /^yes$/i.test(txt(el, tag));
  const rows = [];
  for (const v of vouchers) {
    if (yes(v, 'ISDELETED') || yes(v, 'ISCANCELLED')) continue; // a struck-off voucher doesn't post
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

/** Tally native XML Trial Balance: an <ENVELOPE> of <DSPACCNAME><DSPDISPNAME>
 *  (ledger) rows each followed by a sibling <DSPACCINFO> whose <DSPCLAMTA> is the
 *  closing balance. Tally's sign there is POSITIVE = Credit, NEGATIVE = Debit, so
 *  our signed closing (Dr +, Cr −) = −DSPCLAMTA. Group subtotals are dropped. */
export function parseTallyXmlTB(text) {
  const doc = new DOMParser().parseFromString(String(text), 'application/xml');
  const names = [...doc.querySelectorAll('DSPACCNAME')];
  if (!names.length) return { rows: [], error: 'No <DSPACCNAME> ledger rows found — this is not a Tally Trial Balance XML export (export the TB, or use Excel/CSV).' };
  const rows = [];
  let droppedGroups = 0;
  let curGroup = ''; // best-effort: the last group HEADER seen becomes the context
  for (const n of names) {
    const nameNode = n.querySelector('DSPDISPNAME');
    const ledger = (nameNode ? nameNode.textContent : '').trim();
    if (!ledger || isTBNoiseRow(ledger)) continue;
    // A recognised Tally group name is a HEADER row, not a ledger — drop it from the
    // tie-out but remember it as the group the following ledgers sit under, so the
    // upload carries a group even without an explicit column (best-effort: only the
    // 28 primary groups are recognised as headers).
    if (isTallyGroupRow(ledger)) { curGroup = ledger; droppedGroups += 1; continue; }
    // The amounts sit in the <DSPACCINFO> element that follows this <DSPACCNAME>.
    // Stop if we reach the NEXT ledger first (adjacent DSPACCNAMEs) so a name row
    // never borrows the following ledger's amounts.
    let info = n.nextElementSibling;
    while (info && info.tagName !== 'DSPACCINFO') { if (info.tagName === 'DSPACCNAME') { info = null; break; } info = info.nextElementSibling; }
    const clNode = info ? info.querySelector('DSPCLAMTA') : null;
    const cl = num(clNode ? clNode.textContent.trim() : '');
    if (cl === null || cl === 0) continue; // empty/zero closing (e.g. a pass-through group) — no tie-out signal
    const row = { ledger, closing: -cl };
    if (curGroup) row.group = curGroup;
    rows.push(row);
  }
  return { rows, error: rows.length ? '' : 'Trial Balance XML parsed but no ledger closing balances were found.', note: groupedNote(droppedGroups) };
}

const isXml = (name, text) => /\.xml$/.test(name) || /^\s*(?:<\?xml|<ENVELOPE|<VOUCHER|<DSPACCNAME)/i.test(text);

/** Pick a Day Book file → normalized voucher rows. XML routes to the Tally parser. */
export async function parseDayBookFile(file) {
  const name = (file?.name || '').toLowerCase();
  if (/\.pdf$/.test(name)) return { rows: [], error: 'PDF can’t be parsed — export the Day Book as Excel / CSV / XML.' };
  if (/\.xml$/.test(name)) return parseTallyXmlDayBook(await readText(file));
  if (!/\.(xlsx?|xlsm|html?|htm|csv|txt|tsv)$/.test(name)) {
    const text = await readText(file);
    if (isXml(name, text)) return parseTallyXmlDayBook(text);
  }
  return normalizeDayBook(await fileToMatrix(file));
}

/** Pick a Trial Balance file → normalized TB rows (importTB shape). Tally XML
 *  routes to the DSPACCNAME parser; Excel/CSV/HTML to the columnar normaliser. */
export async function parseTBFile(file) {
  const name = (file?.name || '').toLowerCase();
  if (/\.pdf$/.test(name)) return { rows: [], error: 'PDF can’t be parsed — export the Trial Balance as Excel / CSV / XML.' };
  if (/\.xml$/.test(name)) return parseTallyXmlTB(await readText(file));
  if (/\.(xlsx?|xlsm)$/.test(name)) return normalizeTB(await excelToMatrix(await file.arrayBuffer()));
  // A non-standard extension that actually holds XML (Tally sometimes writes .txt).
  const text = await readText(file);
  if (isXml(name, text)) return parseTallyXmlTB(text);
  if (/\.(html?|htm)$/.test(name) || /^\s*<(!doctype\s+html|html|table)/i.test(text)) return normalizeTB(htmlToMatrix(text));
  return normalizeTB(delimitedToMatrix(text));
}
