/* taxation feature — public barrel (strangler-fig split; see reports/masters/settings).
   BUSINESS SUB-MODULE REORG (2026-07-14): screens are grouped by business
   sub-module — matching the divider groups inside the regime-aware Taxation
   menus in core/data.js (TAX_INDIA/TAX_AFRICA/TAX_ALL) — into gst-returns/,
   tds-tcs/, compliance/, reconciliation/ and auto-prep-tools/ folders.
   TallyExport was misfiled here (an Admin ▸ Import/Export screen) and moved
   to modules/dataImport/. The remaining dead/unrouted content (TaxCalendar,
   shadowed by TaxCalendarV2 which registers first in App.jsx; GSTR_FILING_STATUS,
   Form16Generator, GSTR1_B2B/B2C, GSTR3B_SUMMARY, never referenced anywhere)
   stays in ./legacy. */
export * from './legacy';
export { TaxReco } from './taxReco';
// TDSCalculator moved in from finance/legacy.jsx (2026-07-14) — misfiled
// there; it's a Taxation screen (href /finance/tds-calculator, listed under
// the regime-aware Taxation menus in core/data.js), not a Finance-menu item.
export { TDSCalculator } from './tdsCalculator';

// ── Business sub-module regroup — gst-returns/ ───────────────────────────────
export { TaxGstr1 } from './gst-returns/taxGstr1';
export { TaxGstr3b } from './gst-returns/taxGstr3b';
export { TaxVat } from './gst-returns/taxVat';

// ── Business sub-module regroup — tds-tcs/ ───────────────────────────────────
export { TaxRcm } from './tds-tcs/taxRcm';
export { TaxTdsTcs } from './tds-tcs/taxTdsTcs';
export { Form26AS } from './tds-tcs/form26as';
export { EWayBill } from './tds-tcs/ewayBill';

// ── Business sub-module regroup — compliance/ ────────────────────────────────
export { TaxEInvoice } from './compliance/taxEInvoice';
export { TaxAudit3CD } from './compliance/taxAudit3cd';

// ── Business sub-module regroup — reconciliation/ ────────────────────────────
export { GstrRecon } from './reconciliation/gstrRecon';
export { Gstr9c } from './reconciliation/gstr9c';
export { Gstr2aReco } from './reconciliation/gstr2aReco';

// ── Business sub-module regroup — auto-prep-tools/ ───────────────────────────
export { GSTR1Prep } from './auto-prep-tools/gstr1Prep';
export { GSTR3BPrep } from './auto-prep-tools/gstr3bPrep';
export { Form16AGenerator } from './auto-prep-tools/form16AGenerator';
export { TaxCalendarV2 } from './auto-prep-tools/taxCalendarV2';

// Misfiled in the old monolith — actually an Admin ▸ Import/Export screen.
export { TallyExport } from '../dataImport/tallyExport';
