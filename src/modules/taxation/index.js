/* taxation feature — public barrel (strangler-fig split; see reports/masters/settings). */
export * from './legacy';
export { TaxReco } from './taxReco';
// TDSCalculator moved in from finance/legacy.jsx (2026-07-14) — misfiled
// there; it's a Taxation screen (href /finance/tds-calculator, listed under
// the regime-aware Taxation menus in core/data.js), not a Finance-menu item.
export { TDSCalculator } from './tdsCalculator';
