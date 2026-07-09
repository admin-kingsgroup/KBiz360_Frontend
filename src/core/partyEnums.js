/**
 * Single source of truth for the picklists used by the Customer (Sundry Debtors) and
 * Supplier (Sundry Creditors) masters — both the simple list masters in mastersLive.jsx
 * and the 12-tab masters in mastersParties.jsx import from here, so the two never drift.
 *
 * SUPPLIER_CATS must stay in lock-step with the backend's VALID_CATS
 * (kbiz360-erp-backend/src/features/suppliers/suppliers.validator.js) — that's the only
 * one the server validates against; the rest are stored as-is.
 */

// Supplier category — the closed set the backend validates (VALID_CATS).
export const SUPPLIER_CATS = ['Airline', 'DMC', 'Hotel', 'Visa', 'Insurance', 'Car', 'Misc'];

// GST registration treatment (drives invoice/tax behaviour). '' = not yet classified.
export const GST_TREATMENTS = ['', 'Registered — Regular', 'Registered — Composition', 'Unregistered', 'SEZ', 'Overseas'];

// Country list (mirrors backend gstSupplyType: only India attracts Indian GST/TDS).
export const COUNTRIES = ['India', 'United Arab Emirates', 'Singapore', 'Thailand', 'United Kingdom', 'United States', 'Sri Lanka', 'Nepal', 'Maldives', 'Other'];

// GST state codes (first two digits of a GSTIN) → state name. Mirrors backend IN_STATES.
export const IN_STATES = [
  ['01', 'Jammu & Kashmir'], ['02', 'Himachal Pradesh'], ['03', 'Punjab'], ['04', 'Chandigarh'],
  ['05', 'Uttarakhand'], ['06', 'Haryana'], ['07', 'Delhi'], ['08', 'Rajasthan'], ['09', 'Uttar Pradesh'],
  ['10', 'Bihar'], ['11', 'Sikkim'], ['12', 'Arunachal Pradesh'], ['13', 'Nagaland'], ['14', 'Manipur'],
  ['15', 'Mizoram'], ['16', 'Tripura'], ['17', 'Meghalaya'], ['18', 'Assam'], ['19', 'West Bengal'],
  ['20', 'Jharkhand'], ['21', 'Odisha'], ['22', 'Chhattisgarh'], ['23', 'Madhya Pradesh'], ['24', 'Gujarat'],
  ['26', 'Dadra & Nagar Haveli and Daman & Diu'], ['27', 'Maharashtra'], ['29', 'Karnataka'], ['30', 'Goa'],
  ['31', 'Lakshadweep'], ['32', 'Kerala'], ['33', 'Tamil Nadu'], ['34', 'Puducherry'],
  ['35', 'Andaman & Nicobar Islands'], ['36', 'Telangana'], ['37', 'Andhra Pradesh'], ['38', 'Ladakh'],
];

// State NAMES for a picker (leading '' = "not set"). The backend derives the 2-digit
// state code from the chosen name (gstSupplyType.stateCodeOf), so sending the name is enough.
// 'Others' is auto-selected (see SuppliersMaster) when the party's Country isn't India —
// a foreign party has no Indian GST state, but State is still a mandatory field.
export const STATE_NAMES = ['', 'Others', ...IN_STATES.map(([, n]) => n)];

export const MSME_STATUS = ['', 'Not Registered', 'Micro', 'Small', 'Medium'];
export const TDS_SECTIONS = ['', '194C @ 2%', '194J @ 10%', '194I @ 10%', '194H @ 2%', '194O @ 0.1%', 'None'];
export const PAY_TERMS = ['', 'Advance', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Net 90'];
export const SETTLE_CYCLES = ['', 'Weekly', 'Bi-Monthly (BSP)', 'Monthly', 'On Invoice'];
export const PAY_METHODS = ['', 'Bank Transfer', 'BSP NEFT', 'NEFT/RTGS', 'Cheque', 'UPI', 'Cash'];
export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];
export const ADDR_TYPES = ['Billing', 'Shipping', 'Registered Office', 'Head Office', 'Branch', 'Other'];

// Customer classification.
export const CUST_TYPES = ['', 'Corporate · Premium', 'Corporate · Standard', 'Individual', 'Travel Agent', 'Government'];
export const CUST_SOURCES = ['', 'Direct Referral', 'Cold Outreach', 'Digital Marketing', 'Walk-in', 'Existing Client'];
