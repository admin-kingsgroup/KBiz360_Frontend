export const PRODUCT_MODULES = ['Flight', 'Holiday', 'Hotel', 'Visa', 'Car', 'Insurance', 'Misc'];

export const BAR_COLORS = ['#2563eb', '#16a34a', '#d97706', '#3fb7a3', '#6b4c8b', '#dc2626', '#5b616e'];

export const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

export const ACTION_COLORS = {
  warn: '#d97706',
  info: '#2563eb',
  success: '#16a34a',
};

export const ACTION_BACKGROUNDS = {
  warn: '#fbeedb',     // warning.soft
  info: '#e8f0ff',     // info.soft
  success: '#e8f6ed',  // success.soft
};

// Live, derived from the real system clock (single source of truth: core/dates).
import { todayISO, CUR_MONTH, CUR_FY, monthKey } from '../../../core/dates';

export const TODAY_ISO = todayISO();
export const CURRENT_MONTH = CUR_MONTH;
export const PREV_MONTH = monthKey(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1));
export const FY_START = CUR_FY.startISO;

export const FX_TO_INR = {
  INR: 1,
  USD: 84.5,
  KES: 0.65,
  TZS: 0.034,
  CDF: 0.03,
};

// All product sale/purchase entry is now via the SO/PO/GP booking form (the per-module
// /sales/* routes are RETIRED → read-only registers), so the four module-sale shortcuts
// collapse to one "New Booking" → /bookings/new. Receipt/Payment/Journal open their real
// voucher forms. Every shortcut opens a posting form (no dead "create" buttons).
export const QUICK_CREATE_ACTIONS = [
  { label: '✈ New Booking', route: '/bookings/new', color: '#2563eb' },
  { label: '💰 Receipt',    route: '/receipts',     color: '#6b4c8b' },
  { label: '💸 Payment',    route: '/payments',     color: '#dc2626' },
  { label: '📒 Journal',    route: '/journal',      color: '#5b616e' },
];

// Quick "post" shortcuts for the maker (Accts-Exec) dashboard. Sale/Purchase post via the
// SO/PO/GP booking entry now (per-module /sales/* and /purchase/* are RETIRED → read-only
// registers), so these point at /bookings/new — clicking actually opens a posting form.
// Tiles render as "Post {label}" → labels stay single words so they read naturally
// ("Post Sale", "Post Purchase"). Sale + Purchase both open the SO/PO/GP booking entry.
export const POST_SHORTCUTS = [
  { label: 'Receipt',  icon: '⬇',  route: '/receipts',     color: '#16a34a' },
  { label: 'Payment',  icon: '⬆',  route: '/payments',     color: '#dc2626' },
  { label: 'Sale',     icon: '📄', route: '/bookings/new', color: '#1a1c22' },
  { label: 'Purchase', icon: '📥', route: '/bookings/new', color: '#6B4C8B' },
];

export const MONTH_CLOSE_CHECKLIST = [
  'All Receipt Vouchers posted',
  'All Payment Vouchers approved',
  'Bank reconciliation complete (all banks)',
  'Provisions journal posted',
  'Depreciation run completed',
  'TDS calculation verified',
  'GST input/output tallied',
  'Trial Balance prepared',
  'Variance review with Sr.FM',
  'Period lock requested',
];
