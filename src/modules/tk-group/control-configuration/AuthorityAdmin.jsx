import React, { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPut } from '../../../core/api';
import { Button, Input, LoadingState, PageSection } from '../../../shell/primitives';

// ─── TK GROUP CENTRAL · Approval Authority (Owner-editable) ──────────────────
// WHO verifies / approves / signs (Director, Owner) on the three-level approval
// chain. These are the Owner-controlled `who` rules in the Rule Book registry; their
// value lives in AppConfig and is read LIVE by the approval chain. Editing here writes
// through the governed registry endpoint (PUT /api/rules/:id/value) — Owner-only,
// cache-refreshed (applies immediately, no deploy) and audited. Until now there was NO
// UI for this: the assignees were invisible hardcoded fallbacks.

const chips = (v) => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]);

export function AuthorityAdmin({ canManage = false }) {
  const [rules, setRules] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const list = await apiGet('/api/rules', { govern: 'owner' });
      const who = (list.items || []).filter((r) => r.kind === 'who');
      const withVals = await Promise.all(who.map(async (r) => {
        // apiGet unwraps the { success, data } envelope → `one` IS the rule; its live value is
        // one.value (getOne attaches it). Reading one.data.value always missed → "(none set)".
        const one = await apiGet(`/api/rules/${r.ruleId}`);
        const value = (one && one.value) || [];
        return { ...r, value, draft: chips(value).join(', '), reason: '', msg: '' };
      }));
      setRules(withVals);
    } catch (e) { setError((e && e.message) || 'Failed to load approval authority.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const patch = (id, p) => setRules((rs) => rs.map((r) => (r.ruleId === id ? { ...r, ...p } : r)));

  const save = async (r) => {
    const emails = r.draft.split(/[,;\s]+/).map((e) => e.trim()).filter(Boolean);
    if (!emails.length) { patch(r.ruleId, { msg: 'Enter at least one email.' }); return; }
    if (!r.reason.trim()) { patch(r.ruleId, { msg: 'A reason is required.' }); return; }
    patch(r.ruleId, { msg: 'Saving…' });
    try {
      const res = await apiPut(`/api/rules/${r.ruleId}/value`, { value: emails, reason: r.reason.trim() });
      const value = (res && res.value) || emails; // apiPut also unwraps the envelope → res IS the saved rule
      patch(r.ruleId, { value, draft: chips(value).join(', '), reason: '', msg: 'Saved — applied live to the approval chain.' });
    } catch (e) { patch(r.ruleId, { msg: (e && e.message) || 'Failed to save.' }); }
  };

  if (loading) return <PageSection><LoadingState label="Loading approval authority…" /></PageSection>;
  if (error) return <PageSection><div className="p-4 text-sm text-danger">{error}</div></PageSection>;
  if (!rules || !rules.length) return <PageSection><div className="p-4 text-sm text-ink-muted">No Owner-controlled approval rules found.</div></PageSection>;

  // Segregation-of-duties check AT THE POINT OF EDIT: anyone in BOTH the Verify and Approve
  // lists could verify and then give final approval on their own voucher. The switches screen
  // shows this too, but the Owner types the emails HERE — warn where the mistake is made.
  const vRule = rules.find((r) => r.configKey === 'approval.verifyEmails');
  const aRule = rules.find((r) => r.configKey === 'approval.approveEmails');
  const aSet = new Set(chips(aRule && aRule.value).map((e) => String(e).trim().toLowerCase()));
  const sodOverlap = chips(vRule && vRule.value).filter((e) => e && aSet.has(String(e).trim().toLowerCase()));

  return (
    <div className="mx-auto grid max-w-[660px] gap-3">
      <div className="rounded-lg border border-dashed border-surface-border bg-surface/60 p-3 text-[12px] text-ink-muted">
        Who <b className="text-ink">verifies</b>, <b className="text-ink">approves</b> and signs (Director / Owner) on the three-level approval chain. These are read <b className="text-ink">live from the DB</b> — a change here takes effect immediately, with no deploy, and every change is audited. Owner-only.
      </div>
      {sodOverlap.length > 0 && (
        <div role="alert" className="rounded-lg border border-danger/40 bg-danger-soft p-3 text-[12px] text-danger">
          <b>Segregation-of-duties conflict:</b> {sodOverlap.join(', ')} {sodOverlap.length === 1 ? 'is' : 'are'} in both the <b>Verify</b> and <b>Approve</b> lists — the same person could verify and then give final approval on their own voucher. Remove them from one list.
        </div>
      )}
      {rules.map((r) => (
        <PageSection key={r.ruleId} padded={false} className="overflow-hidden">
          {r.msg && (
            <div role="status" className="border-b border-surface-border bg-warning-soft px-4 py-2 text-xs text-warning">{r.msg}</div>
          )}
          <div className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] font-bold text-accent">{r.ruleId}</span>
              <h2 className="text-[14px] font-bold text-ink">{r.title}</h2>
            </div>
            <div className="mt-0.5 font-mono text-[11px] text-ink-subtle">{r.configKey}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {chips(r.value).length
                ? chips(r.value).map((v, i) => (
                  <span key={i} className="rounded-full border border-surface-border bg-surface px-2 py-0.5 text-[11px] text-ink">{v}</span>
                ))
                : <span className="text-[11px] text-ink-subtle">(none set)</span>}
            </div>
            {canManage ? (
              <div className="mt-3 grid gap-2">
                <label htmlFor={`auth-${r.ruleId}`} className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Emails (comma-separated)</label>
                <Input id={`auth-${r.ruleId}`} value={r.draft} onChange={(e) => patch(r.ruleId, { draft: e.target.value, msg: '' })} placeholder="name@travkings.com, other@…" />
                <Input aria-label="Reason" value={r.reason} onChange={(e) => patch(r.ruleId, { reason: e.target.value })} placeholder="Reason for this change (required)…" />
                <div><Button variant="success" size="sm" write onClick={() => save(r)}>Save — applies live</Button></div>
              </div>
            ) : (
              <div className="mt-3 text-[11px] text-ink-subtle">Read-only — only the Owner can change approval authority.</div>
            )}
          </div>
        </PageSection>
      ))}
    </div>
  );
}
