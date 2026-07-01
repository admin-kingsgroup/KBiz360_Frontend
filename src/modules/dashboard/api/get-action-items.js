import { apiGet } from '../../../core/api';
import { todayISO } from '../../../core/dates';

// Action items — LIVE from the books. Surfaces ADM memos whose dispute window has
// lapsed while still open (status Received/Disputed, responseDeadline already passed),
// read from /api/adm-memos. Returns an array (empty when nothing needs attention).
// (Passenger passports are tracked in the CRM, not the ERP — no item here.)
// Honours the branch selector: a branchCode → only that branch's items; null
// (Group) → company-wide. ADMs that carry no branch stay visible in both.
export const getActionItems = async (branchCode) => {
  const today = todayISO();
  let adms = [];
  try { adms = (await apiGet('/api/adm-memos', branchCode ? { branch: branchCode } : undefined)) || []; } catch { adms = []; }

  const overdueAdm = (adms || []).filter(
    (a) => a && (a.status === 'Disputed' || a.status === 'Received') && a.responseDeadline && a.responseDeadline < today
      && (!branchCode || a.branch == null || a.branch === branchCode),
  );
  const items = [];
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
