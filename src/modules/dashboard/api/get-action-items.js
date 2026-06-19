import { ADM_DATA } from '../../../core/data';
import { _PASSPORTS } from '../../../core/helpers';
import { isoDate } from '../../../core/dates';

export const getActionItems = async () => {
  const items = [];
  const now = new Date();
  const DISPUTE_DEADLINE = isoDate(now);                                                  // anything dated before today is overdue
  const PASSPORT_EXPIRY_THRESHOLD = isoDate(new Date(now.getFullYear(), now.getMonth() + 6, now.getDate())); // expiring within 6 months

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

  return items;
};
