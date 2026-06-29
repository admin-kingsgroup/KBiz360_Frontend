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
