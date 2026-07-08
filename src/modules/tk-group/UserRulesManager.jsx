import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserRules, createUserRule, setUserRuleStatus, testUserRule, deleteUserRule } from './api/userRules';
import { SUBJECT_KINDS, CONSTRAINT_KINDS, EFFECTS, SEVERITIES, statusTone, statusLabel, sevTone, subjectLabel, constraintLabel, ruleKpis, toggleTarget, constraintNeeds } from './utils/userRules';
import { PageSection, ResponsiveGrid, Badge, Button, Input, Select, Textarea, FormField } from '../../shell/primitives';
import { KpiTile } from '../dashboard/components/cards/KpiTile';

// ─── TK GROUP · FE · User Rules Manager (OWNER only) ─────────────────────────
// Add / verify / activate per-user access rules — who may reach which branch,
// module or action, an approval ceiling, view-only or a login window. New rules
// land INACTIVE (Draft) and do nothing until Tested (blast radius) and Activated.
// Sibling of the ERP Rules Manager; same lifecycle and layout.

const empty = { title: '', subject: { kind: 'user', ref: '' }, constraint: { kind: 'branch', effect: 'allow', values: '', limit: '', from: '', to: '' }, severity: 'error', message: '', fixLink: '', remark: '' };

export function UserRulesManager({ canManage = true }) {
  const qc = useQueryClient();
  const [fStatus, setFStatus] = useState('');
  const key = ['tk', 'user-rules', fStatus];
  const { data: rows = [], isLoading, isError } = useQuery({ queryKey: key, queryFn: () => getUserRules(fStatus ? { status: fStatus } : {}), staleTime: 30_000 });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['tk', 'user-rules'] });
  const create = useMutation({ mutationFn: createUserRule, onSuccess: () => { setShowAdd(false); setForm(empty); invalidate(); } });
  const setStatus = useMutation({ mutationFn: ({ id, s }) => setUserRuleStatus(id, s), onSuccess: invalidate });
  const del = useMutation({ mutationFn: deleteUserRule, onSuccess: invalidate });
  const [testRes, setTestRes] = useState({});
  const test = useMutation({ mutationFn: testUserRule, onSuccess: (r, id) => setTestRes((p) => ({ ...p, [id]: r })) });

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(empty);
  const k = ruleKpis(rows);
  const set = (path, v) => setForm((f) => { const n = { ...f }; if (path.includes('.')) { const [a, b] = path.split('.'); n[a] = { ...n[a], [b]: v }; } else n[path] = v; return n; });
  // Comma-separated values → array; the form keeps them as a string for editing.
  const toValues = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);
  const save = () => create.mutate({ ...form, constraint: { ...form.constraint, values: toValues(form.constraint.values) } });
  const remove = (r) => { if (window.confirm(`Delete rule "${r.title}"? This cannot be undone.`)) del.mutate(r._id); };

  const needs = constraintNeeds(form.constraint.kind);
  const subjectOk = form.subject.kind === 'all' || form.subject.ref.trim();
  const constraintOk =
    (needs === 'values' && toValues(form.constraint.values).length) ||
    (needs === 'limit' && Number(form.constraint.limit) > 0) ||
    (needs === 'window' && form.constraint.from.trim() && form.constraint.to.trim()) ||
    needs === 'none';
  const formOk = form.title.trim() && subjectOk && constraintOk;

  if (!canManage) {
    return <div className="rounded-lg border border-dashed border-warning p-8 text-center text-sm text-warning">This screen is for the Owner only. Ask the Owner to manage user access rules.</div>;
  }

  return (
    <div className="grid gap-4">
      <ResponsiveGrid min="150px" gap="md">
        <KpiTile label="Rules" value={`${k.total}`} sub="in the registry" color="#1a1c22" />
        <KpiTile label="Active" value={`${k.active}`} sub="live & enforcing" color="#1a7a4c" />
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
            <FormField label="Rule title"><Input value={form.title} placeholder="e.g. Faiz may only access the BOM branch" onChange={(e) => set('title', e.target.value)} /></FormField>
            <div className="flex flex-wrap gap-3">
              <FormField label="Applies to"><Select value={form.subject.kind} onChange={(e) => set('subject.kind', e.target.value)}>{SUBJECT_KINDS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select></FormField>
              {form.subject.kind !== 'all' && (
                <FormField label={form.subject.kind === 'role' ? 'Role name' : 'User email'}><Input value={form.subject.ref} placeholder={form.subject.kind === 'role' ? 'Accounts Executive' : 'faiz@travkings.com'} onChange={(e) => set('subject.ref', e.target.value)} /></FormField>
              )}
              <FormField label="Severity"><Select value={form.severity} onChange={(e) => set('severity', e.target.value)}>{SEVERITIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select></FormField>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <FormField label="Access"><Select value={form.constraint.kind} onChange={(e) => set('constraint.kind', e.target.value)}>{CONSTRAINT_KINDS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</Select></FormField>
              <FormField label="Effect"><Select value={form.constraint.effect} onChange={(e) => set('constraint.effect', e.target.value)}>{EFFECTS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}</Select></FormField>
              {needs === 'values' && (
                <FormField label="Values (comma-separated)" className="min-w-[220px] flex-1"><Input value={form.constraint.values} placeholder={(CONSTRAINT_KINDS.find((c) => c.value === form.constraint.kind) || {}).ph} onChange={(e) => set('constraint.values', e.target.value)} /></FormField>
              )}
              {needs === 'limit' && (
                <FormField label="Limit"><Input type="number" value={form.constraint.limit} placeholder="100000" onChange={(e) => set('constraint.limit', e.target.value)} /></FormField>
              )}
              {needs === 'window' && (
                <>
                  <FormField label="From"><Input type="time" value={form.constraint.from} onChange={(e) => set('constraint.from', e.target.value)} /></FormField>
                  <FormField label="To"><Input type="time" value={form.constraint.to} onChange={(e) => set('constraint.to', e.target.value)} /></FormField>
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <FormField label="Message" className="min-w-[240px] flex-1"><Input value={form.message} placeholder="This user is not allowed on that branch" onChange={(e) => set('message', e.target.value)} /></FormField>
              <FormField label="Fix link"><Input value={form.fixLink} placeholder="/admin/users" onChange={(e) => set('fixLink', e.target.value)} /></FormField>
            </div>
            <FormField label="Remark"><Textarea rows={2} value={form.remark} placeholder="Why this rule / how to refine it" onChange={(e) => set('remark', e.target.value)} /></FormField>
            <div className="flex items-center gap-3">
              <Button onClick={save} disabled={!formOk || create.isPending} loading={create.isPending}>Save as Draft</Button>
              {!formOk && <span className="text-[11px] text-ink-subtle">Needs a title, a subject and the access it governs.</span>}
              {create.isError && <span className="text-xs text-danger">{create.error?.message || 'Save failed'}</span>}
            </div>
          </div>
        </PageSection>
      )}

      {isError ? <div className="rounded-lg border border-dashed border-warning p-8 text-center text-sm text-warning">This screen is Owner-only, or the rules service is unavailable.</div>
        : isLoading ? <div className="text-xs text-ink-subtle">Loading rules…</div>
          : !rows.length ? <div className="rounded-lg border border-dashed border-surface-border p-8 text-center text-sm text-ink-subtle">No user rules yet — add one above.</div>
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
                        <Badge tone="neutral" size="sm">{subjectLabel(r.subject)}</Badge>
                        <Badge tone="info" size="sm">{constraintLabel(r.constraint)}</Badge>
                      </div>
                      {(r.message || r.remark) && <div className="mt-1 text-[12px] text-ink-muted">{r.message}{r.remark ? <span className="text-ink-subtle"> · remark: {r.remark}</span> : ''}</div>}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {!r.system && (
                          <Button size="sm" variant="secondary" onClick={() => test.mutate(r._id)} loading={test.isPending && test.variables === r._id}>Test (who it hits)</Button>
                        )}
                        {!r.system && (
                          <Button size="sm" variant={r.status === 'active' ? 'ghost' : 'primary'} onClick={() => setStatus.mutate({ id: r._id, s: toggleTarget(r.status) })}>
                            {r.status === 'active' ? 'Deactivate' : 'Activate ▸'}
                          </Button>
                        )}
                        {!r.system && <Button size="sm" variant="ghost" onClick={() => remove(r)} aria-label="Delete rule">✕</Button>}
                        {tr && (
                          <span className="text-[12px] text-ink-muted">
                            {tr.evaluable ? <> applies to <b className="text-ink">{tr.total}</b> user{tr.total === 1 ? '' : 's'}{tr.sample?.length ? <> — {tr.sample.join(', ')}</> : null}</>
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
