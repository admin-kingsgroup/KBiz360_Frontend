import { ADM_DATA } from '../../../core/data';
import { _PASSPORTS } from '../../../core/helpers';

const DISPUTE_DEADLINE = '2026-05-12';
const PASSPORT_EXPIRY_THRESHOLD = '2026-11-19';

export const getActionItems = async () => {
  const items = [];

  const overdueAdm = (ADM_DATA || []).filter(
    (a) => a.status === 'Disputed' && a.date < DISPUTE_DEADLINE,
  );
  if (overdueAdm.length) {
    items.push({
      type: 'warn',
      icon: '📩',
      text: `${overdueAdm.length} ADM${overdueAdm.length > 1 ? 's' : ''} past dispute deadline`,
      route: '/purchase/adm',
      urgent: true,
    });
  }

  items.push({
    type: 'info',
    icon: '💳',
    text: 'BSP settlement due Monday — ₹2,14,000',
    route: '/purchase/bsp-summary',
    urgent: false,
  });

  const expiringPassports = (_PASSPORTS || []).filter(
    (p) => p.expiry < PASSPORT_EXPIRY_THRESHOLD,
  );
  if (expiringPassports.length) {
    items.push({
      type: 'warn',
      icon: '📔',
      text: `${expiringPassports.length} passport${expiringPassports.length > 1 ? 's' : ''} expiring within 6 months`,
      route: '/masters/passports',
      urgent: true,
    });
  }

  items.push({
    type: 'info',
    icon: '📋',
    text: 'GSTR-1 due 11 Jun 2026 — prepare outward supplies',
    route: '/tax/gstr1',
    urgent: false,
  });

  return items;
};
