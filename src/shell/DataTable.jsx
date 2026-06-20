/* ════════════════════════════════════════════════════════════════════
   DataTable — the canonical reusable table for KBiz360
   ════════════════════════════════════════════════════════════════════

   Presentational + generic: it owns NO business data and makes NO API
   calls. Feed it `columns` + `rows` (server state from a TanStack-Query
   hook) and it renders an enterprise-grade table (ERPNext / Odoo feel):

     • viewport-adaptive height — body scrolls inside a bounded box, the
       header stays pinned (sticky thead) and a totals row pins to the
       bottom (sticky tfoot)
     • optional sticky first column and sticky actions column
     • client-side sort, search, pagination
     • column visibility toggle, density toggle, export button
     • right-aligned tabular numerics, text left, status centered
     • first-class loading / empty / error states, professional hover

   ── Column shape ─────────────────────────────────────────────────────
     {
       key:        'closingDebit',          // path into the row (required, dot-ok)
       header:     'Closing Dr',            // column label (default: key)
       align:      'right',                 // 'left' | 'center' | 'right'
       num:        true,                    // tabular-nums + right align
       sortable:   true,                    // default true
       sticky:     'left' | 'right',        // pin this column while scrolling X
       hideable:   false,                   // exclude from the column-visibility menu
       width:      '12rem',
       sortValue:  (row) => row.x,
       render:     (row, value) => <Badge/>,
       footer:     (rows) => sum(rows),     // value for the sticky totals row
       className:  'text-ink-muted',
     }
   ──────────────────────────────────────────────────────────────────── */

import React, { useMemo, useRef, useState } from 'react';
import {
  ChevronDown, ChevronUp, ChevronsUpDown, Inbox, Search, AlertTriangle,
  Columns3, Rows3, Rows4, Download, Check, FileSpreadsheet, Printer,
} from 'lucide-react';
import { exportToExcel } from '../core/exportExcel';
import { openPrintPreview } from '../core/PrintPreview';

const cn = (...xs) => xs.filter(Boolean).join(' ');
const escHtml = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const alignClass = (col) =>
  col.align === 'right' || col.num ? 'text-right'
  : col.align === 'center' ? 'text-center'
  : 'text-left';

const cellValue = (row, col) => {
  if (col.sortValue) return col.sortValue(row);
  return col.key.split('.').reduce((o, k) => (o == null ? o : o[k]), row);
};

function compare(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

// Sticky-column classes. Sticky cells need an opaque background so scrolled
// content doesn't bleed through; header keeps the navy, body uses surface.
const stickyCell = (col, kind /* 'head' | 'body' */) => {
  if (!col.sticky) return '';
  const side = col.sticky === 'right' ? 'right-0' : 'left-0';
  const z = kind === 'head' ? 'z-30' : 'z-20';
  const bg = kind === 'head' ? '' : 'bg-surface';
  const shadow = col.sticky === 'right' ? 'shadow-[-6px_0_8px_-6px_rgba(13,19,38,0.15)]' : 'shadow-[6px_0_8px_-6px_rgba(13,19,38,0.15)]';
  return cn('sticky', side, z, bg, shadow);
};

export function DataTable({
  columns = [],
  rows = [],
  getRowKey,
  loading = false,
  isError = false,
  error = null,
  emptyMessage = 'No records found.',
  emptyHint,
  onRowClick,
  onRetry,
  stickyHeader = true,
  stickyFirstColumn = false,
  dense: denseProp = false,
  zebra = true,
  searchable = false,
  searchPlaceholder = 'Search…',
  initialSort = null,
  pageSize = 0,
  showColumnToggle = false,
  showDensityToggle = true,
  onExport,                       // custom export handler; overrides built-in Excel
  exportName,                     // string → shows an "Excel" button (core/exportExcel)
  printTitle,                     // string → shows a "Print" button (full dataset → A4 preview)
  printSubtitle,
  maxHeight = 'calc(100vh - 16rem)', // viewport-adaptive; body scrolls inside
  title,
  subtitle,
  toolbar,
  className = '',
  minWidth = '44rem',
}) {
  const [sort, setSort] = useState(initialSort);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [hidden, setHidden] = useState(() => new Set());
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const colBtnRef = useRef(null);
  const [denseState, setDenseState] = useState(() => {
    const saved = localStorage.getItem('kbiz360_table_density');
    if (saved) return saved === 'compact';
    return denseProp;
  });

  const dense = denseState;
  const padY = dense ? 'py-1.5' : 'py-2.5';
  const padX = 'px-3.5';
  const tableFontSize = dense ? 'text-[11px]' : 'text-xs';

  const handleToggleDensity = () => {
    setDenseState((d) => {
      const next = !d;
      localStorage.setItem('kbiz360_table_density', next ? 'compact' : 'comfortable');
      return next;
    });
  };

  // Apply sticky-first-column + visibility.
  const effColumns = useMemo(() => {
    let cols = columns.map((c, i) =>
      stickyFirstColumn && i === 0 && !c.sticky ? { ...c, sticky: 'left' } : c);
    if (hidden.size) cols = cols.filter((c) => !hidden.has(c.key));
    return cols;
  }, [columns, stickyFirstColumn, hidden]);

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      effColumns.some((col) => {
        const v = cellValue(row, col);
        return v != null && String(v).toLowerCase().includes(q);
      }));
  }, [rows, effColumns, query]);

  const sorted = useMemo(() => {
    if (!sort) return searched;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return searched;
    const dir = sort.dir === 'desc' ? -1 : 1;
    return [...searched].sort((a, b) => dir * compare(cellValue(a, col), cellValue(b, col)));
  }, [searched, sort, columns]);

  const total = sorted.length;
  // Virtualization-lite: callers that don't set a pageSize render every row. For
  // very large result sets that means thousands of DOM nodes (jank). When a list
  // crosses the threshold we auto-paginate so the DOM stays bounded — export and
  // the totals footer still use the full `sorted` set, so numbers are unaffected.
  const AUTO_PAGE_THRESHOLD = 300, AUTO_PAGE_SIZE = 100;
  const effPageSize = pageSize > 0 ? pageSize : (total > AUTO_PAGE_THRESHOLD ? AUTO_PAGE_SIZE : 0);
  const pages = effPageSize > 0 ? Math.max(1, Math.ceil(total / effPageSize)) : 1;
  const safePage = Math.min(page, pages - 1);
  const visible = effPageSize > 0 ? sorted.slice(safePage * effPageSize, safePage * effPageSize + effPageSize) : sorted;

  const hasFooter = effColumns.some((c) => typeof c.footer === 'function');

  // ── Export / Print over the FULL filtered+sorted set (not just the page) ──
  // Columns can opt out with `exportable: false`; values use `col.exportValue`
  // when given (e.g. to flatten a rendered cell), else the raw keyed value.
  const rawCell = (row, col) => col.key.split('.').reduce((o, k) => (o == null ? o : o[k]), row);
  const exportCols = effColumns.filter((c) => c.exportable !== false);
  const valueFor = (row, col) => (col.exportValue ? col.exportValue(row) : rawCell(row, col));
  const isRightCol = (col) => col.num || col.align === 'right';

  const doExcel = () => {
    if (onExport) return onExport();
    const cols = exportCols.map((c) => ({ key: c.key, label: c.header ?? c.key }));
    const rowsOut = sorted.map((r) => { const o = {}; for (const c of exportCols) o[c.key] = valueFor(r, c); return o; });
    exportToExcel(exportName || 'export', cols, rowsOut);
  };

  const doPrint = () => {
    const fmt = (v, col) => (isRightCol(col) && typeof v === 'number' ? v.toLocaleString('en-IN') : (v == null ? '' : String(v)));
    const align = (col) => (isRightCol(col) ? 'right' : col.align === 'center' ? 'center' : 'left');
    const head = exportCols.map((c) => `<th style="text-align:${align(c)};padding:6px 10px;border-bottom:2px solid #0d1326;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#0d1326;white-space:nowrap">${escHtml(c.header ?? c.key)}</th>`).join('');
    const body = sorted.map((r, i) => `<tr style="background:${i % 2 ? '#f7f8fb' : '#fff'}">${exportCols.map((c) => `<td style="text-align:${align(c)};padding:5px 10px;border-bottom:1px solid #eceef4;font-size:11px;color:#1a1a1a">${escHtml(fmt(valueFor(r, c), c))}</td>`).join('')}</tr>`).join('');
    const foot = hasFooter ? `<tr>${exportCols.map((c) => `<td style="text-align:${align(c)};padding:7px 10px;border-top:2px solid #d4a437;font-weight:700;font-size:11.5px;color:#0d1326">${escHtml(typeof c.footer === 'function' ? c.footer(sorted) : (c.footerLabel ?? ''))}</td>`).join('')}</tr>` : '';
    const html = `<div style="font-family:system-ui,-apple-system,sans-serif"><h2 style="margin:0 0 2px;font-size:16px;color:#0d1326">${escHtml(printTitle)}</h2>${printSubtitle ? `<div style="font-size:11px;color:#5a6691;margin-bottom:10px">${escHtml(printSubtitle)}</div>` : '<div style="margin-bottom:10px"></div>'}<table style="width:100%;border-collapse:collapse"><thead><tr>${head}</tr></thead><tbody>${body}</tbody>${foot ? `<tfoot>${foot}</tfoot>` : ''}</table><div style="margin-top:8px;font-size:9px;color:#8b94b3">${sorted.length} rows</div></div>`;
    openPrintPreview({ title: printTitle, html, recommend: 'landscape' });
  };

  const toggleSort = (col) => {
    if (col.sortable === false) return;
    setPage(0);
    setSort((prev) => {
      if (!prev || prev.key !== col.key) return { key: col.key, dir: col.num ? 'desc' : 'asc' };
      if (prev.dir === 'asc') return { key: col.key, dir: 'desc' };
      return null;
    });
  };

  const toggleColumn = (key) =>
    setHidden((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const colCount = effColumns.length;
  const hasTools = searchable || showColumnToggle || showDensityToggle || onExport || toolbar;
  const showHeaderBar = title || subtitle || hasTools;

  return (
    <div className={cn('flex flex-col rounded-brand border border-surface-border bg-surface shadow-sm overflow-hidden', className)}>
      {showHeaderBar && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-4 py-3">
          <div className="min-w-0">
            {title && <h3 className="truncate text-sm font-bold text-navy">{title}</h3>}
            {subtitle && <p className="mt-0.5 truncate text-xs text-ink-muted">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {searchable && (
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-subtle" />
                <input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setPage(0); }}
                  placeholder={searchPlaceholder}
                  aria-label="Search table"
                  className="h-8 w-40 rounded-md border border-surface-border bg-surface-alt pl-8 pr-2 text-xs text-ink outline-none transition focus:border-gold focus:bg-surface focus:shadow-gold-glow tablet:w-56"
                />
              </div>
            )}
            {showDensityToggle && (
              <button
                onClick={handleToggleDensity}
                title={dense ? 'Comfortable rows' : 'Compact rows'}
                aria-label="Toggle row density"
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-surface-border px-2.5 text-xs font-medium text-ink-muted transition hover:bg-surface-alt"
              >
                {dense ? <Rows3 className="h-4 w-4" /> : <Rows4 className="h-4 w-4" />}
              </button>
            )}
            {showColumnToggle && (
              <div className="relative">
                <button
                  ref={colBtnRef}
                  onClick={() => setColMenuOpen((o) => !o)}
                  title="Show / hide columns"
                  aria-haspopup="true" aria-expanded={colMenuOpen}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-surface-border px-2.5 text-xs font-medium text-ink-muted transition hover:bg-surface-alt"
                >
                  <Columns3 className="h-4 w-4" /> Columns
                </button>
                {colMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setColMenuOpen(false)} />
                    <div
                      role="menu"
                      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setColMenuOpen(false); colBtnRef.current?.focus(); } }}
                      className="absolute right-0 z-50 mt-1 max-h-72 w-52 overflow-auto rounded-md border border-surface-border bg-surface py-1 shadow-brand">
                      {columns.filter((c) => c.hideable !== false).map((c) => {
                        const shown = !hidden.has(c.key);
                        return (
                          <button
                            key={c.key}
                            role="menuitemcheckbox"
                            aria-checked={shown}
                            onClick={() => toggleColumn(c.key)}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-ink hover:bg-surface-alt"
                          >
                            <span className={cn('flex h-3.5 w-3.5 items-center justify-center rounded border', shown ? 'border-navy bg-navy text-white' : 'border-surface-border')}>
                              {shown && <Check className="h-2.5 w-2.5" />}
                            </span>
                            {c.header ?? c.key}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
            {(exportName || onExport) && (
              <button
                onClick={doExcel}
                title="Export to Excel"
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#1D6F42] px-3 text-xs font-semibold text-white transition hover:bg-[#17592f]"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
              </button>
            )}
            {printTitle && (
              <button
                onClick={doPrint}
                title="Print / Save as PDF"
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-surface-border px-3 text-xs font-semibold text-ink-muted transition hover:bg-surface-alt hover:text-navy"
              >
                <Printer className="h-3.5 w-3.5" /> Print
              </button>
            )}
            {toolbar}
          </div>
        </div>
      )}

      {/* Scroll viewport — bounded height; thead/tfoot stick within it */}
      <div className="w-full overflow-auto" style={{ maxHeight }}>
        <table aria-busy={loading || undefined} className={cn('w-full border-collapse', tableFontSize)} style={{ minWidth }}>
          <thead>
            <tr className="bg-navy">
              {effColumns.map((col) => {
                const active = sort?.key === col.key;
                const sortable = col.sortable !== false;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    style={col.width ? { width: col.width } : undefined}
                    className={cn(
                      padX, padY,
                      'bg-navy text-[10.5px] font-bold uppercase tracking-wide text-gold whitespace-nowrap select-none',
                      stickyHeader && 'sticky top-0 z-20',
                      alignClass(col),
                      stickyCell(col, 'head'),
                      col.headerClassName,
                    )}
                  >
                    {/* Sort control is a real button so it's keyboard-operable
                        (Enter/Space) and announced; non-sortable headers render
                        plain text. */}
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col)}
                        className={cn(
                          'inline-flex items-center gap-1 font-bold uppercase tracking-wide text-gold hover:text-gold-light focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 rounded',
                          (col.align === 'right' || col.num) && 'flex-row-reverse',
                        )}
                      >
                        {col.header ?? col.key}
                        {active
                          ? (sort.dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)
                          : <ChevronsUpDown className="h-3 w-3 opacity-30" />}
                      </button>
                    ) : (
                      <span className={cn('inline-flex items-center gap-1', (col.align === 'right' || col.num) && 'flex-row-reverse')}>
                        {col.header ?? col.key}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={`sk-${i}`} className="border-b border-surface-border">
                {effColumns.map((col) => (
                  <td key={col.key} className={cn(padX, padY)}>
                    <div className="h-3 w-3/4 animate-pulse rounded bg-surface-border" />
                  </td>
                ))}
              </tr>
            ))}

            {!loading && isError && (
              <tr>
                <td colSpan={colCount} className="px-4 py-12 text-center">
                  <AlertTriangle className="mx-auto mb-2 h-7 w-7 text-danger" />
                  <p className="text-sm font-semibold text-danger">Couldn’t load this data</p>
                  <p className="mx-auto mt-1 max-w-md text-xs text-ink-muted">
                    {(error && (error.message || String(error))) || 'The request failed. Please try again.'}
                  </p>
                  {onRetry && (
                    <button onClick={onRetry} className="mt-3 rounded-md bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-light">Retry</button>
                  )}
                </td>
              </tr>
            )}

            {!loading && !isError && visible.length === 0 && (
              <tr>
                <td colSpan={colCount} className="px-4 py-12 text-center">
                  <Inbox className="mx-auto mb-2 h-7 w-7 text-ink-subtle" />
                  <p className="text-sm font-medium text-ink-muted">{emptyMessage}</p>
                  {emptyHint && <p className="mt-1 text-xs text-ink-subtle">{emptyHint}</p>}
                </td>
              </tr>
            )}

            {!loading && !isError && visible.map((row, i) => (
              <tr
                key={getRowKey ? getRowKey(row, i) : i}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(row); } } : undefined}
                role={onRowClick ? 'button' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                className={cn(
                  'group border-b border-surface-border',
                  zebra && (i % 2 === 1 ? 'bg-surface-alt/60' : 'bg-surface'),
                  onRowClick && 'cursor-pointer hover:bg-gold-light/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold/50',
                )}
              >
                {effColumns.map((col) => {
                  const v = cellValue(row, col);
                  return (
                    <td
                      key={col.key}
                      className={cn(
                        padX, padY, 'text-ink align-middle', alignClass(col),
                        col.num && 'tabular-nums',
                        stickyCell(col, 'body'),
                        col.className,
                      )}
                    >
                      {col.render ? col.render(row, v) : (v == null || v === '' ? <span className="text-ink-subtle">—</span> : v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>

          {!loading && !isError && hasFooter && visible.length > 0 && (
            <tfoot>
              <tr className="bg-navy">
                {effColumns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      padX, 'py-2.5 font-bold text-white', alignClass(col), col.num && 'tabular-nums',
                      stickyHeader && 'sticky bottom-0 z-20',
                      col.sticky && cn('sticky', col.sticky === 'right' ? 'right-0' : 'left-0', 'z-30 bg-navy'),
                    )}
                  >
                    {typeof col.footer === 'function' ? col.footer(sorted) : (col.footerLabel ?? '')}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {effPageSize > 0 && !loading && !isError && total > effPageSize && (
        <div className="flex items-center justify-between gap-2 border-t border-surface-border px-4 py-2.5 text-xs text-ink-muted">
          <span>{safePage * effPageSize + 1}–{Math.min((safePage + 1) * effPageSize, total)} of {total}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0}
              className="rounded-md border border-surface-border px-2.5 py-1 font-medium disabled:opacity-40 enabled:hover:bg-surface-alt">Prev</button>
            <span className="px-1">Page {safePage + 1} / {pages}</span>
            <button onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={safePage >= pages - 1}
              className="rounded-md border border-surface-border px-2.5 py-1 font-medium disabled:opacity-40 enabled:hover:bg-surface-alt">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
