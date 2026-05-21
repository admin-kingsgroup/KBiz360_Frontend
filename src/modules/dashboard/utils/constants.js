export const PRODUCT_MODULES = ['Flight', 'Holiday', 'Hotel', 'Visa', 'Car', 'Insurance', 'Misc'];

export const BAR_COLORS = ['#185FA5', '#27500A', '#854F0B', '#1D9E75', '#384677', '#A32D2D', '#5a6691'];

export const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

export const ACTION_COLORS = {
  warn: '#854F0B',
  info: '#185FA5',
  success: '#27500A',
};

export const ACTION_BACKGROUNDS = {
  warn: '#FAEEDA',
  info: '#E6F1FB',
  success: '#EAF3DE',
};

export const TODAY_ISO = '2026-05-19';
export const CURRENT_MONTH = '2026-05';
export const PREV_MONTH = '2026-04';
export const FY_START = '2026-04-01';

export const FX_TO_INR = {
  INR: 1,
  USD: 84.5,
  KES: 0.65,
  TZS: 0.034,
};

export const QUICK_CREATE_ACTIONS = [
  { label: '✈ Flight Sale',   route: '/sales/flight',  color: '#185FA5' },
  { label: '🌴 Holiday',      route: '/sales/holiday', color: '#27500A' },
  { label: '🏨 Hotel',        route: '/sales/hotel',   color: '#854F0B' },
  { label: '🛂 Visa',         route: '/sales/visa',    color: '#1D9E75' },
  { label: '💰 Receipt',      route: '/receipts',      color: '#384677' },
  { label: '💸 Payment',      route: '/payments',      color: '#A32D2D' },
  { label: '📒 Journal',      route: '/journal',       color: '#5a6691' },
  { label: '📁 Booking File', route: '/bookings',      color: '#384677' },
];

export const POST_SHORTCUTS = [
  { label: 'Receipt',   icon: '⬇',  route: '/receipts',       color: '#22c55e' },
  { label: 'Payment',   icon: '⬆',  route: '/payments',       color: '#A32D2D' },
  { label: 'Sale Inv.', icon: '📄', route: '/sales/flight',   color: '#0d1326' },
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
