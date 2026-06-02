// React Query hooks that fetch Sales / Purchase voucher data from the KBiz
// Books backend, which reads them LIVE from the shared CRM database:
//
//   Sales    ← CRM TaxInvoice.passengers   (GET /api/crm/sales-tickets?branch=)
//   Purchase ← CRM Supplier rows           (GET /api/crm/purchases?module=&branch=)
//
// The backend reshapes CRM documents into the exact SALES_TICKETS /
// PURCHASE_REGISTRY shapes, scoped to the caller's tenant (from the JWT).
//
// There is NO demo-data fallback: the ERP shows only real data — whatever the
// CRM holds plus anything entered manually in KBiz. Empty in, empty out.

import { useQuery } from '@tanstack/react-query';
import { apiGet, getAuthToken } from './api';

export function useSalesVouchers({ type, branch } = {}) {
  return useQuery({
    // Sale tickets are flight-ticket level; the backend filters by branch.
    // `type` stays in the key only to mirror the caller's signature.
    queryKey: ['crm', 'sales-tickets', type || 'all', branch || 'all'],
    queryFn:  () => apiGet('/api/crm/sales-tickets', { branch }),
    enabled:  !!getAuthToken(),
    staleTime: 30_000,
  });
}

export function usePurchaseVouchers({ type, branch } = {}) {
  return useQuery({
    queryKey: ['crm', 'purchases', type || 'all', branch || 'all'],
    // `module` (PF/PH/PHT/PC/PV/PI/PM) maps to the CRM supplier_type backend-side.
    queryFn:  () => apiGet('/api/crm/purchases', { module: type, branch }),
    enabled:  !!getAuthToken(),
    staleTime: 30_000,
  });
}

// Live purchase registry for the given module + branch. Returns [] until the
// CRM (or manual entry) has data — no demo rows.
export function useLivePurchaseRegistry(purchType, branchCode) {
  const q = usePurchaseVouchers({ type: purchType, branch: branchCode });
  return q.data || [];
}

// Live sale tickets for the given branch. Returns [] until there is real data.
export function useLiveSalesTickets(saleType, branchCode) {
  const q = useSalesVouchers({ type: saleType, branch: branchCode });
  return q.data || [];
}
