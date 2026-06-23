/* Parse a pasted/uploaded Tally ledger export into normalized rows for import.
 * Expected columns (header optional): date, vno, debit, credit, [description].
 * Mirrors the supplier/client parsers but maps the 2nd column to the Tally
 * voucher number. Pure (no imports) so it's unit-testable. */
import { normDate } from './supplierStatementParse';

const parseNum = (s) => { const n = Number(String(s == null ? '' : s).replace(/[^0-9.-]/g, '')); return Number.isFinite(n) ? n : 0; };

export function parseTallyStatement(text) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out = [];
  for (const line of lines) {
    const cells = line.split(line.includes('\t') ? '\t' : ',').map((c) => c.trim());
    if (/^date$/i.test(cells[0]) || (/date/i.test(cells[0]) && /(deb|cred|amount|vch|voucher)/i.test(line))) continue;
    const [date, vno, debit, credit, ...rest] = cells;
    if (!date) continue;
    const d = parseNum(debit);
    const c = parseNum(credit);
    if (!d && !c) continue;
    out.push({ date: normDate(date), vno: vno || '', debit: d, credit: c, description: rest.join(' ').trim() });
  }
  return out;
}

export { normDate };
