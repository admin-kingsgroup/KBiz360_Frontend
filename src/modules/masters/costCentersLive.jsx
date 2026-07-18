/* ════════════════════════════════════════════════════════════════════
   MODULES/COST-CENTERS-LIVE.JSX

   Cost Centre Master — BRANCH-WISE cost centres for module-wise Gross Profit
   on sales & purchase. Every branch carries its own copy of the standard set
   (e.g. BOM-FLT-INT, AMD-HOT …); Super Admin may add CUSTOM cost centres per
   branch and rename / deactivate / delete them.

   • Standard centres (system) can be renamed, reordered and deactivated, but
     never hard-deleted (their code is referenced by historical vouchers).
   • Custom centres are fully editable and deletable.
   Restricted to Super Admin.
   ════════════════════════════════════════════════════════════════════ */

import React, { useState, useMemo, useEffect } from 'react';
import { confirmDialog } from '../../core/ux/confirm';
import { useCostCenters, useCreateCostCenter, useUpdateCostCenter, useDeleteCostCenter, useBackfillCostCenters } from '../../core/useAccounting';
import { useBranches } from '../../core/useReference';
import { exportToExcel } from '../../core/exportExcel';
import { isViewOnly, VIEW_ONLY_REASON } from '../../core/api';

const DARK = '#1a1c22', GOLD = '#c2a04a', DIM = '#5b616e', GREEN = '#16a34a', RED = '#dc2626';
const isSuperAdmin = (u) => /super\s*admin/i.test(u?.role || '');
const inp = { padding: '7px 10px', border: '1px solid #cdd1d8', borderRadius: 6, fontSize: 12.5, outline: 'none' };
const btn = (bg, fg) => ({ padding: '6px 12px', background: bg, color: fg, border: 'none', borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' });

export function CostCenterMasterLive({ currentUser, shellBranch }) {
  const branchesQ = useBranches();
  const branches = branchesQ.data || [];
  const [branch, setBranch] = useState('');
  // A specific top-bar branch pins this master to it; under ALL the in-page pick
  // (else the user's branch, else the first available) decides.
  const shellCode = shellBranch && shellBranch !== 'ALL' ? (shellBranch.code || shellBranch) : '';
  useEffect(() => { if (shellCode) setBranch(shellCode); }, [shellCode]);
  const activeBranch = shellCode || branch || currentUser?.branch || branches[0]?.code || '';

  const q = useCostCenters(activeBranch, { includeInactive: true });
  const createCc = useCreateCostCenter();
  const updateCc = useUpdateCostCenter();
  const deleteCc = useDeleteCostCenter();
  const backfill = useBackfillCostCenters();
  // View-only accounts see every write action (Add / Save / Rename / Deactivate /
  // Delete / Re-tag) disabled with a reason, never a live button that only 403s.
  const vo = isViewOnly();

  const [form, setForm] = useState({ name: '', module: 'Miscellaneous', code: '' });
  const [showAdd, setShowAdd] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }

  const data = q.data || {};
  const centers = data.costCenters || [];
  const modules = data.modules || [];
  const moduleKeys = useMemo(() => (modules.length ? modules.map((m) => m.key) : ['Flights', 'Holiday Packages', 'Hotels', 'Visa Services', 'Car Rental', 'Travel Insurance', 'Miscellaneous']), [modules]);

  const flash = (ok, text) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 4000); };

  if (!isSuperAdmin(currentUser)) {
    return (
      <div style={{ maxWidth: 760, margin: '40px auto', padding: 28, background: '#fff', border: '1px solid #cdd1d8', borderRadius: 10, textAlign: 'center' }}>
        <div style={{ fontSize: 34, marginBottom: 6 }}>🔒</div>
        <h2 style={{ margin: 0, color: DARK, fontSize: 17 }}>Cost Centre Master — restricted</h2>
        <p style={{ color: DIM, fontSize: 12.5, marginTop: 8 }}>
          Branch-wise cost centres. Management is limited to <b>Super Admin</b>.
          {currentUser?.role && <> Your role is <b>{currentUser.role}</b>.</>}
        </p>
      </div>
    );
  }

  const add = () => {
    if (!form.name.trim()) { flash(false, 'Enter a cost-centre name.'); return; }
    createCc.mutate({ branch: activeBranch, name: form.name.trim(), module: form.module, code: form.code.trim() || undefined }, {
      onSuccess: (cc) => { flash(true, `Added ${cc.code}.`); setForm({ name: '', module: 'Miscellaneous', code: '' }); setShowAdd(false); },
      onError: (e) => flash(false, e.message || 'Could not add cost centre'),
    });
  };
  const rename = async (cc) => {
    const { confirmed, reason } = await confirmDialog({ title: `Rename cost centre ${cc.code}`, reasonRequired: true, reasonLabel: 'New name', reasonDefault: cc.name, confirmLabel: 'Rename' });
    const name = reason.trim();
    if (!confirmed || !name || name === cc.name) return;
    updateCc.mutate({ id: cc._id, name }, { onSuccess: () => flash(true, `Renamed ${cc.code}.`), onError: (e) => flash(false, e.message) });
  };
  const toggleActive = (cc) => updateCc.mutate({ id: cc._id, active: !cc.active }, {
    onSuccess: () => flash(true, `${cc.code} ${cc.active ? 'deactivated' : 'reactivated'}.`), onError: (e) => flash(false, e.message),
  });
  const del = async (cc) => {
    const { confirmed } = await confirmDialog({ title: `Delete cost centre ${cc.code}?`, message: 'This cannot be undone.', danger: true, confirmLabel: 'Delete' });
    if (!confirmed) return;
    deleteCc.mutate(cc._id, { onSuccess: () => flash(true, `Deleted ${cc.code}.`), onError: (e) => flash(false, e.message) });
  };
  const runBackfill = () => backfill.mutate(undefined, {
    onSuccess: (d) => flash(true, `Re-tagged ${d.updated} of ${d.scanned} untagged voucher(s).`),
    onError: (e) => flash(false, e.message),
  });

  // Group by module (standard module order first, then any custom modules).
  const orderedModules = [...new Set([...moduleKeys, ...centers.map((c) => c.module)])];
  const byModule = orderedModules
    .map((key) => ({ key, meta: modules.find((m) => m.key === key), leaves: centers.filter((c) => c.module === key).sort((a, b) => (a.order || 0) - (b.order || 0) || a.code.localeCompare(b.code)) }))
    .filter((g) => g.leaves.length);

  const exportSheet = () => exportToExcel(`cost-centres-${activeBranch}`,
    [{ key: 'code', label: 'Code' }, { key: 'name', label: 'Cost Centre' }, { key: 'module', label: 'Module' }, { key: 'branch', label: 'Branch' }, { key: 'kind', label: 'Type' }, { key: 'status', label: 'Status' }],
    centers.map((c) => ({ code: c.code, name: c.name, module: c.module, branch: c.branch, kind: c.system ? 'Standard' : 'Custom', status: c.active ? 'Active' : 'Inactive' })));

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '12px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: DARK }}>Cost Centre Master</h2>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: DIM }}>Branch-wise cost centres for module-wise Gross Profit · standard set + your custom centres</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: DIM }}>Branch&nbsp;
            <select value={activeBranch} disabled={!!shellCode} title={shellCode ? 'Scoped by the top-bar branch — switch it there' : undefined} onChange={(e) => setBranch(e.target.value)} className="max-tablet:min-h-[44px]" style={{ ...inp, padding: '5px 8px' }}>
              {(shellCode ? branches.filter((b) => b.code === shellCode) : branches).map((b) => <option key={b.code} value={b.code}>{b.code}{b.city ? ` — ${b.city}` : ''}</option>)}
            </select>
          </label>
          <span style={{ padding: '4px 10px', background: '#fff7e6', color: '#8a6300', border: '1px solid #f0dca6', borderRadius: 14, fontSize: 11, fontWeight: 700 }}>{centers.length} centres</span>
          <button onClick={() => setShowAdd((s) => !s)} disabled={vo} title={vo ? VIEW_ONLY_REASON : undefined} className="max-tablet:min-h-[44px]" style={{ ...btn(GOLD, DARK), ...(vo ? { cursor: 'not-allowed', opacity: 0.5 } : null) }}>＋ Add cost centre</button>
          <button onClick={exportSheet} disabled={!centers.length} className="max-tablet:min-h-[44px]" style={{ ...btn('#fff', DARK), border: '1px solid #cdd1d8', cursor: centers.length ? 'pointer' : 'not-allowed', opacity: centers.length ? 1 : 0.5 }}>📤 Export</button>
          <button onClick={runBackfill} disabled={backfill.isPending || vo} title={vo ? VIEW_ONLY_REASON : 'Re-derive cost centres for already-imported vouchers from their saved Ticket Type / Service Type / Country'} className="max-tablet:min-h-[44px]" style={{ ...btn(DARK, GOLD), ...(vo ? { cursor: 'not-allowed', opacity: 0.5 } : null) }}>
            {backfill.isPending ? 'Re-tagging…' : '↻ Re-tag vouchers'}
          </button>
        </div>
      </div>

      {msg && <div style={{ marginBottom: 12, padding: '8px 14px', borderRadius: 8, background: msg.ok ? '#eef4ec' : '#fbe9e9', color: msg.ok ? GREEN : RED, fontSize: 12, fontWeight: 600 }}>{msg.ok ? '✓ ' : '⚠ '}{msg.text}</div>}

      {showAdd && (
        <div style={{ marginBottom: 14, padding: 14, background: '#fff', border: '1px solid #cdd1d8', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: DIM, textTransform: 'uppercase' }}>Cost-centre name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Safari Packages" style={{ ...inp, width: 220 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: DIM, textTransform: 'uppercase' }}>Module</label>
            <select value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value })} style={{ ...inp, width: 180 }}>
              {moduleKeys.map((k) => <option key={k} value={k}>{k}</option>)}
              <option value="Custom">Custom</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: DIM, textTransform: 'uppercase' }}>Code (optional)</label>
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="auto from name" style={{ ...inp, width: 150, fontFamily: 'monospace' }} />
          </div>
          <span style={{ fontSize: 10.5, color: DIM, alignSelf: 'center' }}>Will be created for <b>{activeBranch}</b> as <code style={{ color: DARK }}>{activeBranch}-…</code></span>
          <button onClick={add} disabled={createCc.isPending || vo} title={vo ? VIEW_ONLY_REASON : undefined} className="max-tablet:min-h-[44px]" style={{ ...btn(GREEN, '#fff'), ...(vo ? { cursor: 'not-allowed', opacity: 0.5 } : null) }}>{createCc.isPending ? 'Saving…' : 'Save'}</button>
          <button onClick={() => setShowAdd(false)} className="max-tablet:min-h-[44px]" style={{ ...btn('#fff', DIM), border: '1px solid #cdd1d8' }}>Cancel</button>
        </div>
      )}

      {q.isLoading && (
        <div style={{ padding: 14, background: '#fff', border: '1px solid #cdd1d8', borderRadius: 10 }}>
          {Array.from({ length: 7 }).map((_, r) => <div key={r} className="kb-skeleton" style={{ height: 16, borderRadius: 6, marginBottom: 8, opacity: Math.max(0.4, 1 - r * 0.1) }} />)}
        </div>
      )}
      {q.isError && <div style={{ padding: 16, color: RED, background: '#fbe9e9', border: '1px solid #f3c9c9', borderRadius: 10, fontSize: 12, fontWeight: 600 }}>⚠ {q.error?.message || 'Failed to load cost centres'}</div>}

      {!q.isLoading && !q.isError && (
        <div style={{ background: '#fff', border: '1px solid #cdd1d8', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: DARK }}>
                {['Code', 'Cost Centre', 'Module', 'Type', 'Status', 'Actions'].map((h, i) => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: i > 2 ? 'center' : 'left', color: GOLD, fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byModule.map((m) => (
                <React.Fragment key={m.key}>
                  <tr style={{ background: '#f3f6fb', borderTop: '1px solid #cdd1d8' }}>
                    <td colSpan={6} style={{ padding: '7px 14px', fontWeight: 700, color: DARK }}>
                      <span style={{ marginRight: 7 }}>{m.meta?.icon || '•'}</span>{m.key}
                      {m.meta?.hasSubs && <span style={{ marginLeft: 8, fontSize: 9.5, fontWeight: 700, color: '#2563eb', background: '#e8f0ff', border: '1px solid #c3ddf5', borderRadius: 5, padding: '1px 6px' }}>INT'L / DOMESTIC</span>}
                    </td>
                  </tr>
                  {m.leaves.map((c) => (
                    <tr key={c._id || c.code} style={{ borderTop: '1px solid #dfe2e7', opacity: c.active ? 1 : 0.55 }}>
                      <td style={{ padding: '8px 14px', fontFamily: 'monospace', fontWeight: 700, color: DARK }}>{c.code}</td>
                      <td style={{ padding: '8px 14px 8px 28px', color: DARK }}>{c.name}</td>
                      <td style={{ padding: '8px 14px', color: DIM }}>{c.module}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                        {c.system
                          ? <span style={{ padding: '2px 8px', background: '#eef2fb', color: '#3a4d80', borderRadius: 4, fontSize: 10.5, fontWeight: 700 }}>Standard</span>
                          : <span style={{ padding: '2px 8px', background: '#fff3e0', color: '#8a5300', borderRadius: 4, fontSize: 10.5, fontWeight: 700 }}>Custom</span>}
                      </td>
                      <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                        <span style={{ padding: '2px 8px', background: c.active ? '#eef4ec' : '#f0f1f5', color: c.active ? GREEN : DIM, borderRadius: 4, fontSize: 10.5, fontWeight: 700 }}>● {c.active ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td style={{ padding: '6px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button onClick={() => rename(c)} disabled={updateCc.isPending || vo} title={vo ? VIEW_ONLY_REASON : 'Rename'} style={{ ...btn('#fff', DARK), border: '1px solid #cdd1d8', padding: '3px 8px', marginRight: 5, cursor: vo ? 'not-allowed' : 'pointer', opacity: (updateCc.isPending || vo) ? 0.5 : 1 }}>✎</button>
                        <button onClick={() => toggleActive(c)} disabled={updateCc.isPending || vo} title={vo ? VIEW_ONLY_REASON : (c.active ? 'Deactivate' : 'Reactivate')} style={{ ...btn('#fff', c.active ? RED : GREEN), border: '1px solid #cdd1d8', padding: '3px 8px', marginRight: 5, cursor: vo ? 'not-allowed' : 'pointer', opacity: (updateCc.isPending || vo) ? 0.5 : 1 }}>{c.active ? '⏻' : '✓'}</button>
                        {!c.system && <button onClick={() => del(c)} disabled={deleteCc.isPending || vo} title={vo ? VIEW_ONLY_REASON : 'Delete custom cost centre'} style={{ ...btn('#fff', RED), border: '1px solid #f3c9c9', padding: '3px 8px', cursor: vo ? 'not-allowed' : 'pointer', opacity: (deleteCc.isPending || vo) ? 0.5 : 1 }}>🗑</button>}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              {!byModule.length && <tr><td colSpan={6} style={{ padding: 22, textAlign: 'center', color: DIM }}>No cost centres for {activeBranch} yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ fontSize: 10.5, color: DIM, marginTop: 12, lineHeight: 1.6 }}>
        Each branch has its own cost centres (e.g. <code>{activeBranch}-FLT-INT</code>). Standard centres can be renamed or
        deactivated but not deleted — their code is referenced by posted vouchers. Hotels, Visa, Car Rental, Insurance and
        Miscellaneous are tagged automatically from the voucher type; Flights and Holiday are split International / Domestic.
      </p>
    </div>
  );
}
