import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRules, createRule, setRuleStatus, testRule, deleteRule } from './api/rules';
import { SCOPE_LEVELS, SEVERITIES, OPS, statusTone, statusLabel, sevTone, scopeLabel, ruleKpis, toggleTarget } from './utils/rules';
import { PageSection, ResponsiveGrid, Badge, Button, Input, Select, Textarea, FormField } from '../../shell/primitives';
import { KpiTile } from '../dashboard/components/cards/KpiTile';

// ─── TK GROUP · FE · Rules Manager (OWNER only) ──────────────────────────────
// Add / verify / activate Control-Tower rules. New rules land INACTIVE (Draft) — they
// do nothing until Tested on live data and Activated. System rules show read-only (🔒).

const empty = { title: '', scope: { level: 'module', ref: '' }, condition: { kind: 'field', coll: '', branchField: 'branch', field: '', op: 'set', value: '' }, severity: 'warn', message: '', fixLink: '', remark: '' };

export function RulesManager({ canManage = true }) {
  const qc = useQueryClient();
  const [fStatus, setFStatus] = useState('');
  const key = ['tk', 'rules', fStatus];
  const { data: rows = [], isLoading, isError } = useQuery({ queryKey: key, queryFn: () => getRules(fStatus ? { status: fStatus } : {}), staleTime: 30_000 });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['tk', 'rules'] });
  const create = useMutation({ mutationFn: createRule, onSuccess: () => { setShowAdd(false); setForm(empty); invalidate(); } });
  const setStatus = useMutation({ mutationFn: ({ id, s }) => setRuleStatus(id, s), onSuccess: invalidate });
  const del = useMutation({ mutationFn: deleteRule, onSuccess: invalidate });
  const [testRes, setTestRes] = useState({});
  const test = useMutation({ mutationFn: testRule, onSuccess: (r, id) => setTestRes((p) => ({ ...p, [id]: r })) });

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(empty);
  const k = ruleKpis(rows);
  const set = (path, v) => setForm((f) => { const n = { ...f }; if (path.includes('.')) { const [a, b] = path.split('.'); n[a] = { ...n[a], [b]: v }; } else n[path] = v; return n; });
  const save = () => create.mutate(form);
  const remove = (r) => { if (window.confirm(`Delete rule "${r.title}"? This cannot be undone.`)) del.mutate(r._id); };
  // A field rule needs a collection + field; a numeric op needs a value.
  const numericOp = ['>', '>=', '==', '!='].includes(form.condition.op);
  const formOk = form.title.trim() && form.condition.coll.trim() && form.condition.field.trim() && (!numericOp || String(form.condition.value).trim() !== '');

  if (!canManage) {
    return <div className="rounded-lg border border-dashed border-warning p-8 text-center text-sm text-warning">This screen is for the Owner only. Ask the Owner to manage monitoring rules.</div>;
  }

  return (
    <div className="grid gap-4">
      <ResponsiveGrid min="150px" gap="md">
        <KpiTile label="Rules" value={`${k.total}`} sub="in the registry" color="#1a1c22" />
        <KpiTile label="Active" value={`${k.active}`} sub="live & scoring" color="#1a7a4c" />
        <KpiTile label="Inactive / draft" value={`${k.draft}`} sub="not live yet" color="#a86a10" />
        <KpiTile label="System (locked)" value={`${k.system}`} sub="enforced in code" color="#7a8090" />
      </ResponsiveGrid>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-subtle">Filter</span>
        {['', 'active', 'draft', 'inactive'].map((s) => (
          <button key={s || 'all'} type="button" onClick={() => setFStatus(s)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${fStatus === s ? 'border-accent bg-accent text-white' : 'border-surface-border bg-surface text-ink-muted hover:border-accent hover:text-accent'}`}>
            {s ? statusLabel(s).replace(/^[○●◔] /, '') : 'All'}
          </button>
        ))}
        <span className="grow" />
        <Button size="sm" onClick={() => setShowAdd((v) => !v)}>{showAdd ? 'Cancel' : '+ Add rule'}</Button>
      </div>

      {showAdd && (
        <PageSection title="New rule — saves as Inactive (Draft) until you Test & Activate">
          <div className="grid gap-3">
            <FormField label="Rule title"><Input value={form.title} placeholder="e.g. Every booking must have a cost centre" onChange={(e) => set('title', e.target.value)} /></FormField>
            <div className="flex flex-wrap gap-3">
              <FormField label="Scope"><Select value={form.scope.level} onChange={(e) => set('scope.level', e.target.value)}>{SCOPE_LEVELS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select></FormField>
              <FormField label="Applies to (module / dept / voucher)"><Input value={form.scope.ref} placeholder="e.g. customers" onChange={(e) => set('scope.ref', e.target.value)} /></FormField>
              <FormField label="Severity"><Select value={form.severity} onChange={(e) => set('severity', e.target.value)}>{SEVERITIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select></FormField>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <FormField label="Collection"><Input value={form.condition.coll} placeholder="erpcustomers" onChange={(e) => set('condition.coll', e.target.value)} /></FormField>
              <FormField label="Field"><Input value={form.condition.field} placeholder="creditLimit" onChange={(e) => set('condition.field', e.target.value)} /></FormField>
              <FormField label="Rule"><Select value={form.condition.op} onChange={(e) => set('condition.op', e.target.value)}>{OPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select></FormField>
              {form.condition.op !== 'set' && <FormField label="Value"><Input value={form.condition.value} onChange={(e) => set('condition.value', e.target.value)} /></FormField>}
              <FormField label="Per-branch field"><Input value={form.condition.branchField} placeholder="branch" onChange={(e) => set('condition.branchField', e.target.value)} /></FormField>
            </div>
            <div className="flex flex-wrap gap-3">
              <FormField label="Message" className="min-w-[240px] flex-1"><Input value={form.message} placeholder="Debtor has no credit limit set" onChange={(e) => set('message', e.target.value)} /></FormField>
              <FormField label="Fix link"><Input value={form.fixLink} placeholder="/masters/customers" onChange={(e) => set('fixLink', e.target.value)} /></FormField>
            </div>
            <FormField label="Remark"><Textarea rows={2} value={form.remark} placeholder="Why this rule / how to refine it" onChange={(e) => set('remark', e.target.value)} /></FormField>
            <div className="flex items-center gap-3">
              <Button onClick={save} disabled={!formOk || create.isPending} loading={create.isPending}>Save as Draft</Button>
              {!formOk && <span className="text-[11px] text-ink-subtle">Needs a title, collection, field{numericOp ? ' and value' : ''}.</span>}
              {create.isError && <span className="text-xs text-danger">{create.error?.message || 'Save failed'}</span>}
            </div>
          </div>
        </PageSection>
      )}

      {isError ? <div className="rounded-lg border border-dashed border-warning p-8 text-center text-sm text-warning">This screen is Owner-only, or the rules service is unavailable.</div>
        : isLoading ? <div className="text-xs text-ink-subtle">Loading rules…</div>
          : !rows.length ? <div className="rounded-lg border border-dashed border-surface-border p-8 text-center text-sm text-ink-subtle">No rules yet — add one above.</div>
            : (
              <div className="grid gap-2">
                {rows.map((r) => {
                  const tr = testRes[r._id];
                  return (
                    <div key={r._id} className="rounded-lg border border-surface-border bg-surface p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-ink-subtle">{r.ruleId}</span>
                        {r.system && <span title="System rule — enforced in code" className="text-xs">🔒</span>}
                        <span className="font-semibold text-ink">{r.title}</span>
                        <Badge tone={statusTone(r.status)} size="sm">{statusLabel(r.status)}</Badge>
                        <Badge tone={sevTone(r.severity)} size="sm">{r.severity}</Badge>
                        <Badge tone="neutral" size="sm">{scopeLabel(r.scope)}</Badge>
                      </div>
                      {(r.message || r.remark) && <div className="mt-1 text-[12px] text-ink-muted">{r.message}{r.remark ? <span className="text-ink-subtle"> · remark: {r.remark}</span> : ''}</div>}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {!r.system && r.condition && r.condition.coll && (
                          <Button size="sm" variant="secondary" onClick={() => test.mutate(r._id)} loading={test.isPending && test.variables === r._id}>Test on live data</Button>
                        )}
                        {!r.system && (
                          <Button size="sm" variant={r.status === 'active' ? 'ghost' : 'primary'} onClick={() => setStatus.mutate({ id: r._id, s: toggleTarget(r.status) })}>
                            {r.status === 'active' ? 'Deactivate' : 'Activate ▸'}
                          </Button>
                        )}
                        {!r.system && <Button size="sm" variant="ghost" onClick={() => remove(r)} aria-label="Delete rule">✕</Button>}
                        {tr && (
                          <span className="text-[12px] text-ink-muted">
                            {tr.evaluable ? <> would flag <b className="text-ink">{tr.total}</b>{tr.branches?.length ? <> — {tr.branches.filter((b) => b.violations).map((b) => `${b.branch}:${b.violations}`).join(' ')}</> : null}</>
                              : <span className="text-ink-subtle">not testable ({tr.reason})</span>}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
    </div>
  );
}
