/* React-Query hooks for the server-side payroll engine (/api/payroll-runs/*).
   The register / payslips are persisted server-side; these hooks fetch them and
   expose the screen-shaped rows via the pure mappers in payrollMaps.js. */

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, getAuthToken } from '../../core/api';
import { useMasterList } from '../../core/useMasters';
import { fromEmpDTO } from './employeeMap';
import { fromPayrollLineDTO, payrollTotalsFromDTO, matchEmployeeByEmail, currentUserEmail } from './payrollMaps';

const EMPTY_TOTALS = payrollTotalsFromDTO({});

/* The payroll register for a branch-month: persisted lines when the run has been
   processed, else a live server-computed preview (persisted:false). */
export function usePayrollRegister(branch, month) {
  const q = useQuery({
    queryKey: ['payroll-register', branch, month],
    queryFn: () => apiGet('/api/payroll-runs/register', { branch, month }),
    enabled: !!getAuthToken() && !!branch && !!month,
    staleTime: 15_000,
  });
  const rows = useMemo(() => ((q.data && q.data.lines) || []).map(fromPayrollLineDTO), [q.data]);
  const totals = useMemo(() => (q.data && q.data.totals ? payrollTotalsFromDTO(q.data.totals) : EMPTY_TOTALS), [q.data]);
  return {
    ...q,
    rows,
    totals,
    rates: (q.data && q.data.rates) || null,
    run: (q.data && q.data.run) || null,
    persisted: !!(q.data && q.data.persisted),
    // ISO country whose statutory law the server applied ('IN' = Indian PF/ESI/PT/TDS; a foreign
    // branch = its own code + zero Indian deductions). Lets the screen label the regime, never silent.
    statutoryRegime: (q.data && q.data.statutoryRegime) || 'IN',
  };
}

/* Compute + persist a run (idempotent per branch-month — replaces its lines). */
export function useProcessPayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => apiPost('/api/payroll-runs/process', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-register'] });
      qc.invalidateQueries({ queryKey: ['payroll-payslips'] });
      qc.invalidateQueries({ queryKey: ['master', 'payroll-runs'] }); // HR dashboard KPI
    },
  });
}

/* An employee's persisted payslips (newest first); month narrows to one. */
export function usePayslips(empId, month) {
  const q = useQuery({
    queryKey: ['payroll-payslips', empId || '', month || 'all'],
    queryFn: () => apiGet('/api/payroll-runs/payslips', { empId, month }),
    enabled: !!getAuthToken() && !!empId,
    staleTime: 15_000,
  });
  const slips = useMemo(() => ((q.data) || []).map(fromPayrollLineDTO), [q.data]);
  return { ...q, slips };
}

/* PF/ESI/PT challan payment records for a branch-month, keyed by type. */
export function useChallans(branch, month) {
  const q = useQuery({
    queryKey: ['payroll-challans', branch, month],
    queryFn: () => apiGet('/api/payroll-runs/challans', { branch, month }),
    enabled: !!getAuthToken() && !!branch && !!month,
    staleTime: 15_000,
  });
  const byType = useMemo(() => Object.fromEntries(((q.data) || []).map((c) => [c.type, c])), [q.data]);
  return { ...q, byType };
}

export function useMarkChallanPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => apiPut('/api/payroll-runs/challans', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll-challans'] }),
  });
}

/* Resolve the LOGGED-IN user's employee record: localStorage 'kb360-user' email
   → case-insensitive match on the employee master. Drives all self-service
   pages; a null employee (with resolved=true) means "not linked — show the
   ask-HR empty state", never demo data. */
export function useMyEmployee() {
  const email = currentUserEmail();
  const q = useMasterList('employees', {});           // all branches — my record may be anywhere
  const employee = useMemo(
    () => matchEmployeeByEmail(((q.data) || []).map(fromEmpDTO), email),
    [q.data, email],
  );
  return { email, employee, isLoading: q.isLoading, isError: q.isError, resolved: !q.isLoading && !q.isError };
}
