import { compactAmt } from '../../../core/format';
import { bc } from '../../../core/styleTokens';

// Branch-aware compact money for the analytics RPT_ reports (each figure is in the
// branch's OWN currency): ₹ → Cr/L, $ (USD/Africa branches) → K/M/B. Replaces the old
// hardcoded fmtINR so a USD branch no longer prints ₹ on $ figures.
export const cmoney = (branch, n) => compactAmt(n, { currency: (bc(branch) || {}).cur || '₹' });

// D2 consolidated split: compact money in an EXPLICIT currency symbol (from a byCurrency
// entry's `symbol`) rather than the branch's — so ₹ (India) and $ (Africa) subtotals each
// print in their own currency instead of one blended branch-currency figure.
export const cmoneyOf = (symbol, n) => compactAmt(n, { currency: symbol || '₹' });

// Row-drill props: make an analytics table row a keyboard-accessible link into the
// source detail (e.g. a customer/supplier 360° via ?party=). Inert when no route.
export const rrow = (setRoute, route) => (setRoute && route ? {
  onClick: () => setRoute(route), role: 'button', tabIndex: 0,
  onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setRoute(route); } },
  style: { cursor: 'pointer' }, title: 'Open details →',
} : {});

export const partyLink = (base, name) => `${base}?party=${encodeURIComponent(name || '')}`;

export function aggBills(bills, keyOf, fallback = 'Unspecified') {
  const m = new Map();
  for (const b of bills || []) {
    const k = String(keyOf(b) ?? '').trim() || fallback;
    if (!m.has(k)) m.set(k, { key: k, bookings: 0, revenue: 0, cost: 0, branches: new Set(), firstDate: '', lastDate: '' });
    const g = m.get(k);
    g.bookings += 1; g.revenue += b.sell || 0; g.cost += b.cost || 0;
    if (b.branch) g.branches.add(b.branch);
    const d = b.date || '';
    if (d) { if (!g.firstDate || d < g.firstDate) g.firstDate = d; if (!g.lastDate || d > g.lastDate) g.lastDate = d; }
  }
  return [...m.values()].map((g) => {
    const gp = Math.round((g.revenue - g.cost) * 100) / 100;
    return { ...g, branches: [...g.branches], gp, gpPct: g.revenue > 0 ? +((gp / g.revenue) * 100).toFixed(1) : 0 };
  });
}
