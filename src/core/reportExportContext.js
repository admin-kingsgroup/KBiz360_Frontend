// ───────────────────────────────────────────────────────────────────────────
// Report export context — lets the screen that's currently on-display hand the
// global Report Action Bar high-quality, structured data for its Tally export
// (and a better title / filename) instead of the bar having to scrape the DOM.
//
// A report registers via the `useReportExport` hook; the registration is cleared
// automatically when the report unmounts (route change), so the bar always
// reflects the visible screen and never leaks stale data between screens.
// ───────────────────────────────────────────────────────────────────────────
import { useEffect } from 'react';

let current = null;
const subscribers = new Set();

function emit() { subscribers.forEach((fn) => { try { fn(current); } catch { /* ignore */ } }); }

export function setReportExport(ctx) { current = ctx || null; emit(); }
export function clearReportExport() { current = null; emit(); }
export function getReportExport() { return current; }
export function subscribeReportExport(fn) { subscribers.add(fn); return () => subscribers.delete(fn); }

/**
 * Register structured export data for the current screen.
 *
 * @param {object|null} ctx
 * @param {string}  [ctx.title]            display title / filename stem
 * @param {'ledgers'|'vouchers'} [ctx.kind] which builder the rows feed
 * @param {object[]} [ctx.rows]            ledger rows {name,amount,drCr,parent}
 *                                         OR voucher rows {date,vno,vchType,entries[]}
 * @param {string}  [ctx.company]
 * @param {'portrait'|'landscape'} [ctx.recommend]
 * @param {any[]}   [deps]                 re-register when these change
 */
export function useReportExport(ctx, deps = []) {
  useEffect(() => {
    setReportExport(ctx || null);
    return () => clearReportExport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
