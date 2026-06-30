// Shared Revoke action for the voucher drill-downs (VoucherShell + VoucherEditor).
//
// The Voucher Approvals queue can revoke an approved/posted voucher back to Pending,
// but a posted voucher is also reached straight from the Day Book, ledgers, Cash Book,
// P&L / Balance Sheet and registers. Those open a read-only view — this hook lets that
// view offer the SAME Revoke (server preflight → blast-radius dialog → reason → un-post)
// so the user doesn't have to leave the report to un-approve. Logic mirrors
// voucherApprovals.doRevoke exactly, so both paths behave identically.
import { useRevokeVoucher, fetchRevokeCheck } from '../useAccounting';
import { confirmDialog } from '../ux/confirm';
import { toast } from '../ux/toast';
import { isApprover } from '../api';
import { setNavFocus } from '../ux/navFocus';

// A voucher LOCKED to a parent master is a leg of a file (SO/PO/GP booking, INB deal,
// purchase-expense order, ADM/ACM register) — it can never be edited or revoked alone;
// you act on the parent, which un-posts every leg together. Mirrors the backend
// LOCKED_MASTERS gate, so the read-only editor hides Save/Revoke and points at the parent.
const PARENT_LABEL = {
  booking: 'SO / PO / GP booking',
  inb: 'INB deal',
  'expense-order': 'purchase expense order',
  'adm-register': 'ADM register',
  'acm-register': 'ACM register',
};
// Parents we can one-click open (deep-link → the approvals screen, right tab, filtered
// to the parent ref so the user can revoke the whole file there).
const PARENT_NAV = {
  booking: { route: '/transactions/approvals', domain: 'sopogp' },
  inb: { route: '/transactions/inb-approvals', domain: 'inbspg' },
};
export function voucherParent(v) {
  const label = v && v.locked ? PARENT_LABEL[v.source] : null;
  return label ? { label, ref: v.bookingId || v.sourceRef || '', source: v.source, navigable: !!PARENT_NAV[v.source] } : null;
}

// Deep-link from a read-only leg to its parent file's approvals screen, focused on the
// parent (right domain + the Approved tab + search seeded to the ref). Returns false for
// a parent we can't navigate to (caller keeps the plain "act on <parent>" text).
export function openParentFile(v) {
  const nav = v && v.locked ? PARENT_NAV[v.source] : null;
  if (!nav) return false;
  const ref = v.bookingId || v.sourceRef || '';
  setNavFocus(nav.route, { kind: 'file', domain: nav.domain, status: 'approved', search: ref, label: PARENT_LABEL[v.source], ref });
  try { window.dispatchEvent(new CustomEvent('kb:open-register', { detail: { route: nav.route } })); } catch { /* ignore */ }
  return true;
}

export function useVoucherRevoke() {
  const revoke = useRevokeVoucher();
  const canRevoke = isApprover();
  // doRevoke(id, onDone?): runs the preflight, surfaces hard blocks, requires a reason,
  // then un-posts → Pending (the number is kept). onDone fires after a successful revoke
  // (the caller usually closes the now-stale read-only view).
  const doRevoke = async (id, onDone) => {
    let pre = null;
    try { pre = await fetchRevokeCheck(id); } catch (e) { toast(e?.message || 'Could not check this voucher', 'error'); return; }
    if (pre && (pre.blocks || []).length) { toast(`Can't revoke — ${pre.blocks.map((b) => b.msg).join(' ')}`, 'error'); return; }
    const warns = (pre?.warnings || []).map((w) => w.msg).filter(Boolean);
    const rows = pre?.journalRows ? `This un-posts ${pre.journalRows} journal row${pre.journalRows === 1 ? '' : 's'}. ` : '';
    const { confirmed, reason } = await confirmDialog({
      title: 'Revoke voucher?',
      message: `${rows}It returns to Pending for editing & re-approval (the number is kept).${warns.length ? ' Note: ' + warns.join(' ') : ''}`,
      danger: true, reasonRequired: true, reasonLabel: 'Reason for revoke', confirmLabel: 'Revoke',
    });
    if (confirmed) {
      revoke.mutate({ id, reason }, {
        onSuccess: () => { toast('Voucher revoked → Pending'); if (onDone) onDone(); },
        onError: (e) => toast(e?.message || 'Revoke failed', 'error'),
      });
    }
  };
  return { canRevoke, doRevoke, revoking: revoke.isPending };
}
