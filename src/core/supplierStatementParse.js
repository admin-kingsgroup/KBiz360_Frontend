/* Parse a pasted/upload vendor statement into normalized rows for import.
 * Accepts CSV or tab-separated text. Expected columns (header optional):
 *   date, invoiceNo, debit, credit, [description...]
 * - `date` accepts ISO (YYYY-MM-DD) or DD/MM/YYYY (and DD-MM-YYYY).
 * - amounts may carry thousands separators / currency symbols.
 * Blank rows and rows with neither debit nor credit are dropped.
 * Pure (no imports) so it's unit-testable without the app's import.meta tree.   */
const parseNum = (s) => {
  const n = Number(String(s == null ? '' : s).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

export function normDate(s) {
  const str = String(s || '').trim();
  let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  m = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) { let y = +m[3]; if (y < 100) y += 2000; return `${y}-${String(+m[2]).padStart(2, '0')}-${String(+m[1]).padStart(2, '0')}`; }
  return str.slice(0, 10);
}

export function parseSupplierStatement(text) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out = [];
  for (const line of lines) {
    // Pick ONE delimiter per line: tab when present (so amounts may keep their
    // thousands commas), otherwise comma. Mixing both would split "1,250.50".
    const cells = line.split(line.includes('\t') ? '\t' : ',').map((c) => c.trim());
    // Skip a header row (first cell mentions "date" and the line names amount cols).
    if (/^date$/i.test(cells[0]) || (/date/i.test(cells[0]) && /(deb|cred|amount|invoice)/i.test(line))) continue;
    const [date, invoiceNo, debit, credit, ...rest] = cells;
    if (!date) continue;
    const d = parseNum(debit);
    const c = parseNum(credit);
    if (!d && !c) continue; // nothing to reconcile on this row
    out.push({ date: normDate(date), invoiceNo: invoiceNo || '', debit: d, credit: c, description: rest.join(' ').trim() });
  }
  return out;
}
