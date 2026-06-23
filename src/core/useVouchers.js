// React Query hooks that feed the live Sales / Purchase REGISTERS — the
// purchase-linking picker on the sale-entry form and the BSP settlement report.
//
// These now read the ERP's OWN vouchers (GET /api/vouchers), NOT the CRM bridge.
// The Sales (S*) and Purchase (P*) legs spawned when an SO/PO/GP booking is
// approved — plus any manually-entered sale/purchase vouchers — live in the ERP
// `vouchers` collection under category 'sale' / 'purchase'. We adapt each voucher
// DTO into the SALES_TICKETS / PURCHASE_REGISTRY shapes the registers expect.
//
//   Sales    ← GET /api/vouchers?category=sale&type=<module>&branch=
//   Purchase ← GET /api/vouchers?category=purchase&type=<module>&branch=
//
// (Previously these read GET /api/crm/sales-tickets and /api/crm/purchases over
// the shared CRM database; that bridge has been removed — the ERP is the single
// source of truth for its own books.)

import { useQuery } from '@tanstack/react-query';
import { apiGet, getAuthToken } from './api';

const num = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);

// One ERP sale voucher → a sales-ticket register row (header-level). The full
// per-passenger fare breakup, when needed, rides on the voucher's lines/pax.
export function toSaleRow(v) {
  return {
    branch:     v.branch || '',
    vno:        v.vno || '',
    date:       v.date || '',
    customer:   v.billTo || v.party || '',
    saleAmt:    num(v.total),
    costCenter: v.costCenter || '',
    linkNo:     v.linkNo || '',
    tallyRef:   v.sourceRef || '',
  };
}

// One ERP purchase voucher → a purchase-registry row (used to link a sale to its
// purchase for GP, and by the BSP settlement math).
export function toPurchaseRow(v, module) {
  return {
    vno:      v.vno || '',
    branch:   v.branch || '',
    date:     v.date || '',
    supplier: v.billTo || v.party || '',
    ref:      v.againstInvoice || v.linkNo || '',
    tallyRef: v.sourceRef || '',
    desc:     v.remarks || '',
    amt:      num(v.total),
    incentive:    0,
    incentiveGst: 0,
    incentiveTds: 0,
    // Payment status is tracked via allocations, not a flag on the voucher; GP
    // linking is independent of whether the bill is paid, so every purchase is
    // available to link.
    settled:  false,
    module:   module || v.type || '',
  };
}

// The register rows (toSaleRow / toPurchaseRow) read only header fields — never
// lines[]/meta — so ask the backend for just those columns (?fields=). This keeps the
// heavy per-line fare payload off the wire (a sale register was ~16s of full docs vs
// ~2.4s lean). The capture/pivot view, which DOES need lines, fetches separately.
const REGISTER_FIELDS = 'branch,vno,date,billTo,party,total,costCenter,linkNo,sourceRef,againstInvoice,remarks,type';

export function useSalesVouchers({ type, branch } = {}) {
  return useQuery({
    queryKey: ['vouchers', 'sales', type || 'all', branch || 'all'],
    queryFn: async () => {
      const params = { category: 'sale', branch, fields: REGISTER_FIELDS };
      if (type) params.type = type;            // module code (SF/SH/…) = the sale voucher type
      const rows = await apiGet('/api/vouchers', params);
      return (rows || []).map(toSaleRow);
    },
    enabled:  !!getAuthToken(),
    staleTime: 30_000,
  });
}

export function usePurchaseVouchers({ type, branch } = {}) {
  return useQuery({
    queryKey: ['vouchers', 'purchases', type || 'all', branch || 'all'],
    queryFn: async () => {
      const params = { category: 'purchase', branch, fields: REGISTER_FIELDS };
      if (type) params.type = type;            // purchase module code (PF/PH/…) = the purchase voucher type
      const rows = await apiGet('/api/vouchers', params);
      return (rows || []).map((v) => toPurchaseRow(v, type));
    },
    enabled:  !!getAuthToken(),
    staleTime: 30_000,
  });
}

// Live purchase registry for the given module + branch. Returns [] until there
// is real data (an approved SO/PO/GP purchase leg or a manual entry).
export function useLivePurchaseRegistry(purchType, branchCode) {
  const q = usePurchaseVouchers({ type: purchType, branch: branchCode });
  return q.data || [];
}

// Live sale tickets for the given branch. Returns [] until there is real data.
export function useLiveSalesTickets(saleType, branchCode) {
  const q = useSalesVouchers({ type: saleType, branch: branchCode });
  return q.data || [];
}
