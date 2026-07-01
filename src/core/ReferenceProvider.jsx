/* ════════════════════════════════════════════════════════════════════
   ReferenceProvider — bootstraps DB-backed reference data ONCE per session.

   It fetches the small set of reference collections the app reads
   synchronously (branches, company profiles, currencies, roles + the
   permission catalogue) and pushes them into the synchronous referenceCache so
   legacy call-sites (FX_RATES[…], bc(branch), ROLE checks) keep working without
   per-call network round-trips. While the critical set is loading it shows a
   lightweight splash so the shell renders against real data, not fallbacks.
   ════════════════════════════════════════════════════════════════════ */
import React, { useEffect } from 'react';
import { useBranches, useCompanyProfiles, useCurrencies, useRoles, useRolesMeta, useHsnCodes } from './useReference';
import { setBranches, setBranchCfg, setCurrencyMeta, setRoles, setPermMeta, setHsnCodes } from './referenceCache';
import { getAuthToken } from './api';

export function ReferenceProvider({ children }) {
  const hasToken = !!getAuthToken();

  const branches   = useBranches();
  const profiles   = useCompanyProfiles();
  const currencies = useCurrencies();
  const roles      = useRoles();
  const rolesMeta  = useRolesMeta();
  const hsn        = useHsnCodes();

  // Push each result into the synchronous cache as it arrives.
  useEffect(() => { if (branches.data)   setBranches(branches.data); }, [branches.data]);
  useEffect(() => { if (profiles.data)   setBranchCfg(profiles.data); }, [profiles.data]);
  useEffect(() => { if (hsn.data)        setHsnCodes(hsn.data); }, [hsn.data]);
  useEffect(() => { if (currencies.data) setCurrencyMeta(currencies.data); }, [currencies.data]);
  useEffect(() => { if (roles.data)      setRoles(roles.data); }, [roles.data]);
  useEffect(() => {
    if (rolesMeta.data) setPermMeta({ modules: rolesMeta.data.modules, actions: rolesMeta.data.actions, toggles: rolesMeta.data.toggles });
  }, [rolesMeta.data]);

  // Critical set must settle (success OR error) before we render the shell, so
  // bc()/role checks read live data. A query error resolves to "settled" too —
  // the cache keeps its safe fallback rather than blocking the app forever.
  const critical = [branches, currencies, roles, rolesMeta];
  const ready = !hasToken || critical.every((q) => q.isSuccess || q.isError);

  if (hasToken && !ready) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f3f4f8', flexDirection: 'column', gap: 14, fontFamily: 'system-ui,sans-serif' }}>
        <div style={{ width: 34, height: 34, border: '3px solid #cdd1d8', borderTopColor: '#0d1326', borderRadius: '50%', animation: 'kbspin 0.8s linear infinite' }} />
        <div style={{ color: '#5a6691', fontSize: 13, fontWeight: 600 }}>Loading KBiz360…</div>
        <style>{'@keyframes kbspin{to{transform:rotate(360deg)}}'}</style>
      </div>
    );
  }
  return children;
}
