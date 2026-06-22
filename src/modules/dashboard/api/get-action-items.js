import { apiGet } from '../../../core/api';
import { todayISO } from '../../../core/dates';

// Action items — LIVE from the books. Today this surfaces ADM memos whose dispute
// window has lapsed while still open (status Received/Disputed, responseDeadline
// already passed), read from /api/adm-memos. Returns an array (empty when nothing
// needs attention). Passport-expiry alerts are omitted until a passport store exists
// — we never invent an item from seed data.
export const getActionItems = async () => {
  const items = [];
  const today = todayISO();
  let adms = [];
  try { adms = (await apiGet('/api/adm-memos')) || []; } catch { adms = []; }

  const overdueAdm = (adms || []).filter(
    (a) => a && (a.status === 'Disputed' || a.status === 'Received') && a.responseDeadline && a.responseDeadline < today,
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
  return items;
};
