// ───────────────────────────────────────────────────────────────────────────
// Dependency-free "Export to Excel".
//
// Produces a UTF-8 CSV (with BOM) that Excel, Google Sheets and Numbers all
// open directly into columns — no binary .xlsx writer / runtime dependency.
// Numbers stay numeric; text with commas/quotes/newlines is escaped per RFC 4180.
// ───────────────────────────────────────────────────────────────────────────

function csvCell(v) {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s) || /^\s|\s$/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

/**
 * Download an array of objects as a CSV Excel opens directly.
 * @param {string} filename            without extension (".csv" appended)
 * @param {{key:string,label?:string}[]} columns
 * @param {object[]} rows              keyed by column.key
 */
export function exportToExcel(filename, columns, rows) {
  const header = columns.map((c) => csvCell(c.label ?? c.key)).join(',');
  const body = (rows || []).map((r) => columns.map((c) => csvCell(r[c.key])).join(',')).join('\r\n');
  const csv = '﻿' + header + '\r\n' + body;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safe = String(filename || 'export').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-');
  a.download = safe.endsWith('.csv') ? safe : `${safe}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

const num = (n) => { const v = Number(n); return Number.isFinite(v) ? v : 0; };

/**
 * Flatten vouchers into a sheet whose columns are the core header fields plus
 * EVERY original Tally field captured on the line `meta` (base fare, K3, taxes,
 * service charge, CGST/SGST/IGST, markup, TCS …). Meta columns appear in
 * first-seen order so a single sheet can mix product types without losing data.
 *
 * @param {object[]} vouchers   voucher DTOs (must include `lines[].meta`)
 * @param {object[]} [lead]     extra leading columns [{key,label}] already on each row
 * @returns {{columns, rows}}
 */
export function vouchersToSheet(vouchers, lead = []) {
  const core = [
    ['date', 'Date'], ['vno', 'Voucher No'], ['type', 'Type'], ['category', 'Category'],
    ['party', 'Party'], ['linkNo', 'Link No'],
    ['subtotal', 'Taxable Value'], ['taxAmt', 'GST'], ['total', 'Invoice Total'],
  ];
  const metaKeys = [];
  const seen = new Set();
  for (const v of vouchers || []) {
    for (const ln of v.lines || []) {
      const m = ln.meta && typeof ln.meta === 'object' ? ln.meta : {};
      for (const k of Object.keys(m)) if (!seen.has(k)) { seen.add(k); metaKeys.push(k); }
    }
  }
  const columns = [
    ...lead,
    ...core.map(([key, label]) => ({ key, label })),
    ...metaKeys.map((k) => ({ key: `meta:${k}`, label: k })),
  ];
  const rows = (vouchers || []).map((v) => {
    const row = { ...(v.__lead || {}) };
    row.date = v.date; row.vno = v.vno; row.type = v.type; row.category = v.category;
    row.party = v.party; row.linkNo = v.linkNo;
    row.subtotal = num(v.subtotal); row.taxAmt = num(v.taxAmt); row.total = num(v.total);
    for (const ln of v.lines || []) {
      const m = ln.meta && typeof ln.meta === 'object' ? ln.meta : {};
      for (const k of Object.keys(m)) {
        const rk = `meta:${k}`;
        const val = m[k];
        const prev = row[rk];
        // A voucher can have several lines (e.g. one per passenger) carrying the SAME
        // meta key. Collapsing to one row per voucher must not drop the others: sum
        // numeric meta (Base Fare, K3…) and join distinct text meta (Ticket No, PNR…)
        // instead of keeping only the first value.
        if (typeof val === 'number') {
          row[rk] = (typeof prev === 'number' ? prev : 0) + val;
        } else if (prev == null || prev === '') {
          row[rk] = val;
        } else if (val != null && val !== '' && !String(prev).split(', ').includes(String(val))) {
          row[rk] = `${prev}, ${val}`;
        }
      }
    }
    return row;
  });
  return { columns, rows };
}
