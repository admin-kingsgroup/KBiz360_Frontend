import React from 'react';

/**
 * Declarative route table for the finance feature — the forward-compatible
 * config the host mounts under react-router-dom. As each legacy finance screen
 * is migrated into `pages/`, add its `{ path, title, moduleName, Element }`
 * here and the incremental router in App.jsx will render it natively (anything
 * not listed still falls through to the legacy string-router).
 *
 * NOTE: this table is imported EAGERLY by App.jsx (it must exist synchronously
 * to drive routing), so the page `Element`s are wrapped in React.lazy() — that
 * keeps the actual page code (and its heavy deps: pnlTally → styles → recharts)
 * OUT of the initial bundle. App.jsx renders migrated routes inside a <Suspense>
 * boundary, so the lazy elements resolve transparently.
 */
const lazyEl = (loader, name) =>
  React.lazy(() => loader().then(m => ({ default: m[name] })));

export const financeRoutes = [
  // Mounted at /finance/trial-balance so it lands alongside the legacy
  // /trial-balance screen during migration (no regression); it takes over the
  // canonical path once it reaches feature parity (export / print / drill).
  { path: '/finance/trial-balance', title: 'Trial Balance', moduleName: 'Finance', Element: lazyEl(() => import('../pages/trial-balance'), 'TrialBalancePage') },

  // Voucher registers — live from GET /api/vouchers, period driven by the FY selector.
  { path: '/finance/receipt-register', title: 'Receipt Register', moduleName: 'Finance', Element: lazyEl(() => import('../pages/voucher-register'), 'ReceiptRegisterPage') },
  { path: '/finance/payment-register', title: 'Payment Register', moduleName: 'Finance', Element: lazyEl(() => import('../pages/voucher-register'), 'PaymentRegisterPage') },
  { path: '/finance/contra-register', title: 'Contra Register', moduleName: 'Finance', Element: lazyEl(() => import('../pages/voucher-register'), 'ContraRegisterPage') },
  { path: '/finance/journal-register', title: 'Journal Register', moduleName: 'Finance', Element: lazyEl(() => import('../pages/voucher-register'), 'JournalRegisterPage') },
  { path: '/finance/refund-register', title: 'Refund Register', moduleName: 'Finance', Element: lazyEl(() => import('../pages/voucher-register'), 'RefundRegisterPage') },
  { path: '/finance/reissue-register', title: 'Reissue Register', moduleName: 'Finance', Element: lazyEl(() => import('../pages/voucher-register'), 'ReissueRegisterPage') },
  { path: '/finance/debit-note-register', title: 'Debit Note Register', moduleName: 'Finance', Element: lazyEl(() => import('../pages/voucher-register'), 'DebitNoteRegisterPage') },
];
