/**
 * Single source of truth for statutory tax slabs used across voucher forms and
 * the finance module. These are regulatory constants (TDS sections u/s 194x and
 * the GST rate slabs), deliberately defined once here so no module keeps its own
 * copy. If/when these become admin-editable they should move to app-config and
 * this file becomes the fallback.
 */

// TDS sections → { label, rate %, threshold, payable ledger key }.
export const TDS_SECTIONS = {
  '194C': { label: '194C - Contractors/DMC', rate: 2, threshold: 30000, payable: 'tds_pay_c' },
  '194H': { label: '194H - Commission/BSP', rate: 5, threshold: 15000, payable: 'tds_pay_h' },
  '194J': { label: '194J - Professional Svc', rate: 10, threshold: 30000, payable: 'tds_pay_j' },
  '194D': { label: '194D - Insurance', rate: 5, threshold: 15000, payable: 'tds_pay_d' },
  'None': { label: 'No TDS', rate: 0, threshold: 0, payable: null },
};

// The full set of GST rate slabs (%). The active subset per branch lives in
// company-profile.gstRates; this is the complete statutory slab list.
export const GST_SLABS = [0, 5, 12, 18, 28];
