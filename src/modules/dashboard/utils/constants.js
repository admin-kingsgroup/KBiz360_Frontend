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

export const QUICK_CREATE_ACTIONS = [
  { label: '✈ Flight Sale',   route: '/sales/flight',  color: '#2563eb' },
  { label: '🌴 Holiday',      route: '/sales/holiday', color: '#16a34a' },
  { label: '🏨 Hotel',        route: '/sales/hotel',   color: '#d97706' },
  { label: '🛂 Visa',         route: '/sales/visa',    color: '#3fb7a3' },
  { label: '💰 Receipt',      route: '/receipts',      color: '#6b4c8b' },
  { label: '💸 Payment',      route: '/payments',      color: '#dc2626' },
  { label: '📒 Journal',      route: '/journal',       color: '#5b616e' },
];

export const POST_SHORTCUTS = [
  { label: 'Receipt',   icon: '⬇',  route: '/receipts',       color: '#16a34a' },
  { label: 'Payment',   icon: '⬆',  route: '/payments',       color: '#dc2626' },
  { label: 'Sale Inv.', icon: '📄', route: '/sales/flight',   color: '#1a1c22' },
  { label: 'Purchase',  icon: '📥', route: '/purchase/flight',color: '#6B4C8B' },
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
