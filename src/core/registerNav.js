// ───────────────────────────────────────────────────────────────────────────
// Open the Module Sales / Purchase Register from anywhere, pre-filtered to one
// invoice. Mirrors openLedgerModal's fire-and-forget event pattern so callers
// (e.g. the P&L drill's Ledger Account) need no router wiring.
//
//   import { openModuleRegister } from '../core/registerNav';
//   openModuleRegister('sale', 'SF/BOM/26/0123');   // sale → Sales Register
//   openModuleRegister('purchase', 'PF/BOM/26/0007'); // purchase → Purchase Register
//
// App.jsx listens for 'kb:open-register' and navigates to the route; the register
// reads the pending search needle on mount (so it lands on that one booking — the
// register haystack includes saleVno / purchaseVno / linkNo).
// ───────────────────────────────────────────────────────────────────────────
const SALES_ROUTE = '/finance/module-sales-register';
const PURCHASE_ROUTE = '/finance/module-purchase-register';

let pendingSearch = null;

// side: 'purchase' (or a category containing "purchase") → Purchase Register;
// anything else → Sales Register. `needle` is the free-text the register filters by.
export function openModuleRegister(side, needle) {
  const purchase = /purchase|^p/i.test(String(side || ''));
  const route = purchase ? PURCHASE_ROUTE : SALES_ROUTE;
  pendingSearch = needle ? String(needle) : '';
  try { window.dispatchEvent(new CustomEvent('kb:open-register', { detail: { route } })); } catch { /* ignore */ }
}

// The register calls this on mount to seed (and clear) its search box.
export function consumePendingRegisterSearch() {
  const p = pendingSearch;
  pendingSearch = null;
  return p;
}
