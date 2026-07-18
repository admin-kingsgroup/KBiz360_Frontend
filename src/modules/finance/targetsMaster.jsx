/* ════════════════════════════════════════════════════════════════════
   SALES TARGETS  /finance/targets
   Set whole-FY targets per module. The Director "vs Target" dashboards
   pro-rate these to the period and compare against actuals.

   BUSINESS SUB-MODULE REORG (2026-07-13): moved out of
   directorDashboards/directorDashboards.jsx (MENU_FINANCE ▸ Period-End,
   Targets & Accruals ▸ "Sales Targets" — the one export in that file that
   wasn't actually MENU_DASHBOARDS-bound like its 18 siblings).
   ════════════════════════════════════════════════════════════════════ */
import { useState } from 'react';
import { FocusBanner } from '../../core/ux/FocusBanner';
import { Button, Select, Input, FormField } from '../../shell/primitives';
import { useSalesTargets, useSaveTargets } from '../../core/useAccounting';
import { branchList, fyStr, MOD_OPTS, Card } from '../dashboard/director/shared';

// ── Targets master (set targets that the vs-Target dashboards compare to) ──────
export function TargetsMaster({ branch }) {
  const [brCode, setBrCode] = useState((branch && branch.code) || 'BOM');
  const [fy, setFy] = useState(fyStr());
  const [metric, setMetric] = useState('sales');
  const [draft, setDraft] = useState({});
  // Currency follows the branch picked in THIS screen's dropdown (brCode), not the
  // global branch — USD branches (NBO/DAR/FBM) must show $ in the target header.
  const cur = (branchList().find((b) => b.code === brCode) || {}).cur || '₹';
  const q = useSalesTargets({ code: brCode }, fy, metric);
  const save = useSaveTargets();
  const existing = {}; (q.data || []).forEach((t) => { if ((t.month || 0) === 0) existing[t.module || ''] = t.amount; });
  const valOf = (mod) => (draft[mod] !== undefined ? draft[mod] : (existing[mod] ?? ''));
  const onSave = () => {
    // Collections AND Nett Profit are company-wide only — the engine ignores per-module
    // rows for them, so don't persist module rows (avoids orphan 0-amount DB rows).
    const companyOnly = metric === 'collections' || metric === 'np';
    const opts = MOD_OPTS.filter(([mod]) => !companyOnly || mod === '');
    const rows = opts.map(([mod]) => ({ month: 0, metric, module: mod, amount: Number(valOf(mod)) || 0 }));
    save.mutate({ branch: brCode, fy, rows }, { onSuccess: () => setDraft({}) });
  };
  const metricLabel = { sales: 'Sales', gp: 'GP', collections: 'Collections', np: 'Nett Profit' }[metric];
  const companyOnly = metric === 'collections' || metric === 'np';
  const rows = MOD_OPTS.filter(([mod]) => !companyOnly || mod === '');
  return (
    <div className="w-full px-4 py-4 tablet:px-6 tablet:py-5 desktop:px-8">
      <FocusBanner />
      <div className="mb-4 border-b border-surface-border pb-3">
        <div className="text-lg font-extrabold text-ink">Sales Targets</div>
        <div className="mt-0.5 text-xs text-ink-muted">Set whole-FY targets per module. The Director "vs Target" dashboards pro-rate these to the period and compare against actuals.</div>
      </div>
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-brand border border-surface-border bg-surface-alt/60 px-3.5 py-3">
        <FormField label="Branch" className="w-28">
          <Select value={brCode} onChange={(e) => setBrCode(e.target.value)} className="font-semibold">
            {branchList().map((b) => <option key={b.code} value={b.code}>{b.code}</option>)}
          </Select>
        </FormField>
        <FormField label="Financial Year" className="w-36">
          <Input value={fy} onChange={(e) => setFy(e.target.value)} placeholder="e.g. 2026-27" />
        </FormField>
        <FormField label="Metric" className="w-44">
          <Select value={metric} onChange={(e) => setMetric(e.target.value)} className="font-semibold">
            <option value="sales">Sales</option><option value="gp">Gross Profit</option><option value="collections">Collections</option><option value="np">Nett Profit</option>
          </Select>
        </FormField>
      </div>
      <Card title={`${metricLabel} target · ${brCode} · FY ${fy}`} right={<Button variant="accent" size="sm" write loading={save.isPending} onClick={onSave}>Save</Button>}>
        <div className="mb-1.5 grid grid-cols-1 gap-3 p-3.5 tablet:grid-cols-2 desktop:grid-cols-3 wide:grid-cols-4">
          {rows.map(([mod, label]) => (
            <div key={mod || 'all'}
              className={`rounded-brand border p-3 transition-colors ${mod === '' ? 'border-navy/25 bg-navy/5' : 'border-surface-border bg-surface hover:border-ink-subtle'}`}>
              <div className="mb-1.5 truncate text-[12.5px] font-semibold text-ink">{label}{mod === '' ? ' (company)' : ''}</div>
              <div className="flex items-center overflow-hidden rounded-md border border-surface-border bg-surface focus-within:border-gold focus-within:shadow-gold-glow">
                <span className="shrink-0 border-r border-surface-border bg-surface-alt px-2.5 py-2 text-xs font-bold text-ink-muted">{cur}</span>
                <input type="number" value={valOf(mod)} onChange={(e) => setDraft((d) => ({ ...d, [mod]: e.target.value }))}
                  className="w-full min-w-0 border-0 bg-transparent px-2.5 py-2 text-right text-[13px] tabular-nums text-ink outline-none" placeholder="0" />
              </div>
            </div>
          ))}
        </div>
      </Card>
      {save.isSuccess && <div className="mt-2 text-xs text-success">✓ Saved.</div>}
      {companyOnly && <div className="mt-2 text-[11px] text-ink-muted">{metricLabel} targets are company-wide — only the "All modules" row is used.</div>}
    </div>
  );
}
