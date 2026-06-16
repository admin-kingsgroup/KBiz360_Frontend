import { TrialBalancePage } from '../pages/trial-balance';
import { ReceiptRegisterPage, PaymentRegisterPage, ContraRegisterPage, JournalRegisterPage } from '../pages/voucher-register';

/**
 * Declarative route table for the finance feature — the forward-compatible
 * config the host mounts under react-router-dom. As each legacy finance screen
 * is migrated into `pages/`, add its `{ path, title, moduleName, Element }`
 * here and the incremental router in App.jsx will render it natively (anything
 * not listed still falls through to the legacy string-router).
 */
export const financeRoutes = [
  // Mounted at /finance/trial-balance so it lands alongside the legacy
  // /trial-balance screen during migration (no regression); it takes over the
  // canonical path once it reaches feature parity (export / print / drill).
  { path: '/finance/trial-balance', title: 'Trial Balance', moduleName: 'Finance', Element: TrialBalancePage },

  // Voucher registers — live from GET /api/vouchers, period driven by the FY selector.
  { path: '/finance/receipt-register', title: 'Receipt Register', moduleName: 'Finance', Element: ReceiptRegisterPage },
  { path: '/finance/payment-register', title: 'Payment Register', moduleName: 'Finance', Element: PaymentRegisterPage },
  { path: '/finance/contra-register', title: 'Contra Register', moduleName: 'Finance', Element: ContraRegisterPage },
  { path: '/finance/journal-register', title: 'Journal Register', moduleName: 'Finance', Element: JournalRegisterPage },
];
