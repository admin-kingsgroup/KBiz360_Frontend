// ───────────────────────────────────────────────────────────────────────────
// usePager / Pager — INFINITE SCROLL for hand-rolled tables & lists.
//
// Renders a growing WINDOW of rows (DEFAULT_STEP at first, +STEP more each time
// the bottom sentinel scrolls into view) instead of every row at once, so the DOM
// stays small and the screen paints fast — the "load 20, scroll for more" feel.
//
// The caller keeps owning the FULL array — totals, search and Excel export all run
// over the complete set; only the rendered window grows. API is unchanged for
// callers, so it's a drop-in for the old page-based version:
//
//   const pg = usePager(filteredRows);
//   {pg.pageRows.map(renderRow)}
//   <Pager pager={pg} />        // the bottom sentinel + "Load more" fallback
//
// IMPORTANT placement: <Pager> (the sentinel) must sit INSIDE the same scrollable
// container as the rows (the element with overflow:auto / kb-sticky), as the LAST
// element after the table — so it's only revealed when you scroll to the bottom.
// The observer auto-detects that scroll container; if the sentinel is left OUTSIDE
// an inner scroll box it'd always be visible and load everything at once.
//
// The window resets to the top whenever the set's SIZE changes (filter / search /
// refetch), keyed on the row COUNT (a stable primitive) — not array identity — so
// a caller that recomputes rows.filter(...) inline each render doesn't thrash.
// ───────────────────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useRef, useState } from 'react';

export const DEFAULT_STEP = 20; // rows shown initially + added per scroll / Load-more

// Nearest scrollable ancestor of `el` (overflow-y auto|scroll with real overflow),
// or null → observe against the viewport (page scroll). Lets one hook serve both
// inner-scroll tables (kb-sticky / max-height boxes) and plain page-scroll lists.
function scrollParentOf(el) {
  let n = el && el.parentElement;
  while (n && n !== document.body) {
    let oy = '';
    try { oy = window.getComputedStyle(n).overflowY; } catch { /* jsdom */ }
    if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight) return n;
    n = n.parentElement;
  }
  return null;
}

export function usePager(rows, step = DEFAULT_STEP) {
  const list = Array.isArray(rows) ? rows : [];
  const total = list.length;
  const s = step > 0 ? step : DEFAULT_STEP;
  const [count, setCount] = useState(s);
  // Re-bound to the top whenever the set size changes (filter / search / new data),
  // so the DOM never balloons after a previous deep-scroll.
  useEffect(() => { setCount(s); }, [total, s]);
  const shown = Math.min(count, total);
  const pageRows = list.slice(0, shown);
  const hasMore = shown < total;
  const sentinelRef = useRef(null);
  const loadMore = useCallback(() => setCount((c) => c + s), [s]);

  // Auto-load when the sentinel nears the bottom of its scroll container/viewport.
  useEffect(() => {
    if (!hasMore || typeof IntersectionObserver === 'undefined') return undefined;
    const el = sentinelRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) setCount((c) => c + s); },
      { root: scrollParentOf(el), rootMargin: '300px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, s, shown]); // re-arm after each grow (shown changes → sentinel re-evaluated)

  return {
    pageRows, total, count: shown, hasMore, loadMore, sentinelRef,
    enabled: hasMore,           // back-compat: callers used `enabled` to show the bar
    from: total === 0 ? 0 : 1,  // back-compat no-ops (legacy fields)
    to: shown, step: s,
  };
}

export function Pager({ pager, className = '' }) {
  if (!pager || !pager.hasMore) return null; // everything shown → nothing to do
  const { total, count, loadMore, sentinelRef } = pager;
  return (
    <div ref={sentinelRef}
      className={`flex items-center justify-center gap-3 border-t border-surface-border px-4 py-2.5 text-xs text-ink-muted ${className}`}>
      <span>Showing {count.toLocaleString('en-IN')} of {total.toLocaleString('en-IN')}</span>
      <button type="button" onClick={loadMore}
        className="rounded-md border border-surface-border px-2.5 py-1 font-medium enabled:hover:bg-surface-alt">
        Load more
      </button>
    </div>
  );
}

export default usePager;
