// ───────────────────────────────────────────────────────────────────────────
// usePager / Pager — client-side pagination for hand-rolled tables & lists.
//
// The shared <DataTable> already auto-paginates; this is the same model for the
// older inline-styled tables (Sales/Purchase Register, booking workspace, approval
// queues, …) that render every row and so paint hundreds of DOM nodes at once.
//
// The caller keeps owning the FULL array — totals, search and Excel export all run
// over the complete set — while only ONE page of rows is rendered, so the DOM stays
// bounded and the screen feels instant:
//
//   const pg = usePager(filteredRows);          // 100/page by default
//   {pg.pageRows.map(renderRow)}
//   <Pager pager={pg} />                          // hidden automatically when 1 page
//
// `page` is clamped to the valid range, so when a filter shrinks the set the view
// never gets stranded on an empty page. Keyed on the page COUNT (a number), not the
// array identity, so a caller that recomputes `rows.filter(...)` inline each render
// doesn't thrash the page back to 0.
// ───────────────────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useState } from 'react';

export const DEFAULT_PAGE_SIZE = 100;

export function usePager(rows, pageSize = DEFAULT_PAGE_SIZE) {
  const list = Array.isArray(rows) ? rows : [];
  const total = list.length;
  const [page, setPage] = useState(0);
  const pages = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const safePage = Math.min(page, pages - 1);
  // Snap back into range when the underlying set shrinks past the current page.
  useEffect(() => { if (page > pages - 1) setPage(pages - 1); }, [pages, page]);
  const pageRows = useMemo(
    () => (pageSize > 0 ? list.slice(safePage * pageSize, safePage * pageSize + pageSize) : list),
    [list, pageSize, safePage],
  );
  const from = total === 0 ? 0 : safePage * pageSize + 1;
  const to = Math.min((safePage + 1) * pageSize, total);
  return { pageRows, page: safePage, setPage, pages, total, pageSize, from, to, enabled: pageSize > 0 && total > pageSize };
}

export function Pager({ pager, className = '' }) {
  if (!pager || !pager.enabled) return null; // one page → nothing to show
  const { page, setPage, pages, total, from, to } = pager;
  return (
    <div className={`flex items-center justify-between gap-2 border-t border-surface-border px-4 py-2.5 text-xs text-ink-muted ${className}`}>
      <span>{from}–{to} of {total}</span>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
          className="rounded-md border border-surface-border px-2.5 py-1 font-medium disabled:opacity-40 enabled:hover:bg-surface-alt">Prev</button>
        <span className="px-1">Page {page + 1} / {pages}</span>
        <button type="button" onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}
          className="rounded-md border border-surface-border px-2.5 py-1 font-medium disabled:opacity-40 enabled:hover:bg-surface-alt">Next</button>
      </div>
    </div>
  );
}

export default usePager;
