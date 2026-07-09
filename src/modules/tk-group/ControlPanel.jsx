import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFlagState, proposeFlags } from './api/flags';
import { withToggled } from './utils/flags';
import { useConfigValue } from '../../core/useAccounting';
import { approvalChainView, POWER_SCREENS, CONTROL_LISTS, CAP_COLS, ROLE_CAPS } from './utils/controlPanel';
import { readinessFromFlags } from './utils/readiness';
import { Badge } from '../../shell/primitives';

// ─── TK GROUP CENTRAL · Control Panel → Power Console ─────────────────────────
// The Owner's power console: 17 screens across Enforcement / Access & Rights /
// Governance / Oversight that decide WHO MAY DO WHAT. Everything ships OFF (dormant)
// and is switched on one-by-one and user-by-user. This view is READ-ONLY — it shows
// the true state (real flags + approval config) and routes to Control Flags / Limits,
// where changes are proposed and Owner-approved. Nothing here enforces or disrupts
// current work.
const VOUCHER_TYPES = ['SO/PO/GP', 'INB', 'Receipt', 'Payment', 'Contra', 'Journal', 'Purchase Expense', 'Debit Note', 'Refund', 'Reissue', 'ADM', 'ACM'];
const SENSITIVE = new Set(['Payment', 'Journal', 'Debit Note', 'Refund', 'Reissue', 'ADM', 'ACM']);
const CAP_GLYPH = { full: '●', cond: '◐', none: '○' };
const CAP_COLOR = { full: 'text-success', cond: 'text-warning', none: 'text-ink-subtle' };
const USERS = [
  { n: 'Sughra', r: 'Accounts Executive', b: 'All branches', lv: 'Verify', setup: 70 },
  { n: 'Faiz', r: 'Finance Manager', b: 'All branches', lv: 'Approve · Post', setup: 85 },
  { n: 'Farhan', r: 'Director', b: 'All branches', lv: 'Oversight', setup: 60 },
  { n: 'Afshin', r: 'Owner', b: 'All branches', lv: 'Full override', setup: 90 },
  { n: 'BOM Accountant', r: 'Branch Accountant', b: 'BOM', lv: 'Check', setup: 55 },
  { n: 'NBO Accountant', r: 'Branch Accountant', b: 'NBO', lv: 'Check', setup: 45 },
];

const Off = () => <Badge tone="neutral" size="sm">Off</Badge>;
const H3 = ({ children }) => <h3 className="mb-2 mt-5 text-[15px] font-semibold text-ink">{children}</h3>;
// Interactive switch — flipping it PROPOSES the change (Owner-approved), it does not
// flip live. Off = grey, On = teal (crit = red for money controls).
function Toggle({ on, crit, onClick, label }) {
  return (
    <button type="button" role="switch" aria-checked={!!on} aria-label={label} onClick={onClick}
      className={`relative h-[24px] w-[42px] shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 ${on ? (crit ? 'bg-danger' : 'bg-success') : 'bg-surface-border'}`}>
      <span className="absolute top-[2.5px] h-[19px] w-[19px] rounded-full bg-white shadow transition-all" style={{ left: on ? 20 : 2.5 }} />
    </button>
  );
}
function Row({ nm, ds, st, flag, on, crit, onPropose, right, applied, guarded, planned, declined }) {
  const control = right !== undefined ? right
    : flag ? <Toggle on={on} crit={crit} label={nm} onClick={() => onPropose && onPropose(flag)} />
    : applied ? <Badge tone="success" size="sm">Active</Badge>
    : guarded ? <Badge tone="info" size="sm">Via master guard</Badge>
    : declined ? <Badge tone="neutral" size="sm">Not required</Badge>
    : planned ? <Badge tone="neutral" size="sm">Planned</Badge>
    : <Off />;
  const state = flag ? (on ? 'On' : 'Off') : applied ? 'Active now' : guarded ? 'Engages with the master guard' : declined ? 'Owner decided — not adopted' : planned ? 'Not built yet' : 'Off';
  const engaged = flag ? on : applied;
  const accentColor = engaged ? (crit ? '#dc2626' : '#16a34a') : '#cdd1d8';
  return (
    <div className="flex items-start gap-3 rounded-brand border border-l-4 border-surface-border bg-surface p-3.5 shadow-sm transition-colors" style={{ borderLeftColor: accentColor }}>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold text-ink">{nm}</div>
        {ds && <div className="mt-0.5 text-[11.5px] text-ink-muted">{ds}</div>}
        <div className={`mt-2 inline-block rounded-full px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wide ${engaged ? (crit ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success') : 'bg-surface-alt text-ink-subtle'}`}>
          {state}{st ? ' · ' + st : ''}{flag ? ' · proposes to Owner' : ''}
        </div>
      </div>
      {control}
    </div>
  );
}
const ControlList = ({ items, isOn = () => false, onPropose = () => {} }) => (
  <div className="grid gap-2.5 tablet:grid-cols-2">{items.map((c, i) => <Row key={i} {...c} on={c.flag ? isOn(c.flag) : false} onPropose={onPropose} />)}</div>
);
// Check → Verify → Approve reads as a pipeline, so each level gets its own accent
// (blue → amber → green) rather than three identical white boxes.
const CHAIN_COLORS = ['#2563eb', '#d97706', '#16a34a'];
function ChainCard({ k, r, w, n }) {
  const color = CHAIN_COLORS[(n - 1) % CHAIN_COLORS.length] || '#5b616e';
  return (
    <div className="min-w-[170px] flex-1 rounded-brand border border-t-4 border-surface-border bg-surface p-3.5 shadow-sm" style={{ borderTopColor: color }}>
      <div className="flex items-center gap-1.5">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: color }}>{n}</span>
        <div className="font-mono text-[9.5px] uppercase tracking-wide text-ink-subtle">{k}</div>
      </div>
      <div className="mt-1.5 text-[15px] font-semibold text-ink">{r}</div>
      <div className="truncate text-[11px] text-ink-muted">{w}</div>
    </div>
  );
}

export function ControlPanel({ setRoute }) {
  const [screen, setScreen] = useState('master');
  const flagsQ = useQuery({ queryKey: ['tk', 'flags'], queryFn: getFlagState, staleTime: 30_000 });
  const verify = useConfigValue('approval.verifyEmails').data;
  const approve = useConfigValue('approval.approveEmails').data;
  const v = approvalChainView({ verifyEmails: verify, approveEmails: approve, flags: flagsQ.data });
  const r = readinessFromFlags(flagsQ.data);
  const go = (route) => setRoute && setRoute(route);
  const qc = useQueryClient();
  const [msg, setMsg] = useState('');
  const flags = flagsQ.data?.flags || {};
  const isOn = (key) => { const f = flags[key] || {}; return f.foundation === true || f.enabled === true; };
  // Flipping a control PROPOSES the change through the Owner-approved change-request
  // flow — it never flips live. Dormant-safe: even an approved flag stays guarded by
  // core.policy_guard until that master is on.
  const onPropose = async (key) => {
    setMsg('');
    try {
      await proposeFlags(withToggled(flagsQ.data || { flags: {} }, key));
      setMsg('Change to “' + key + '” submitted for the Owner’s approval — it applies only once approved.');
      qc.invalidateQueries({ queryKey: ['tk', 'flags'] });
    } catch (e) { setMsg((e && e.message) || 'Could not submit the change.'); }
  };

  const screenBody = () => {
    switch (screen) {
      case 'master':
        return (
          <>
            <p className="mb-4 mt-1 max-w-[78ch] text-[13.5px] text-ink-muted">The one switch that makes every other setting live. While off, this console is advisory — nobody is blocked, nothing needs approval, your migration continues untouched.</p>
            <Row nm="Engage the TK Group guard (go-live switch)"
              ds="Flip this LAST, once the other screens are set. Then everyone comes under control at once — or ramp per voucher type first."
              st="core.policy_guard" flag="core.policy_guard" on={v.masterOn} onPropose={onPropose} />
            <div className="mt-[18px] flex items-start gap-2.5 rounded-[9px] border border-warning/40 bg-warning-soft px-[15px] py-3 text-[12.5px] text-warning [&_b]:font-semibold"><span>🛡️</span><span><b>Nothing is engaged.</b> This console decides who may do what; it takes no action itself. Changes are proposed on Control Flags and Owner-approved. Hand power over slowly — one control, one voucher type, one user at a time.</span></div>
          </>
        );
      case 'approval':
        return (
          <>
            <p className="mb-4 mt-1 max-w-[78ch] text-[13.5px] text-ink-muted">The three-level chain and the rights on it. Each level switchable; a person with no control on them acts independently.</p>
            <div className="flex flex-wrap items-stretch gap-2">
              {v.levels.map((l, i) => (
                <React.Fragment key={l.n}>
                  <ChainCard k={`Level ${l.n} · ${l.name}`} r={l.role} w={l.who} n={l.n} />
                  {i < v.levels.length - 1 && (
                    <div className="flex items-center text-ink-subtle" aria-hidden>
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-alt text-[13px]">→</span>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="mt-3 grid gap-2.5">
              <Row nm="Require Verify (Sughra)" ds="A voucher must be verified before approval." st="verify not required" />
              <Row nm="Require approval before posting" ds="Every voucher starts Pending — nothing hits the books until it's approved; the maker can clear their own until you engage the review chain. Already enforced on all non-booking entries." applied />
              <Row nm="Let Sughra also Approve (AE-approve)" ds="Elevates the AE from verify-only to also give final approval on a branch-accountant voucher."
                st="Sughra verifies only" flag="approval.ae_can_approve" on={v.aeCanApprove} onPropose={onPropose} />
              <Row nm="Owner co-sign on sensitive types" ds="Refund · reissue · write-off · adjustment JV also need Afshin." st="sensitive" />
            </div>
            <H3>Who is under control</H3>
            <div className="grid gap-3 tablet:grid-cols-2">
              {v.people.map((p) => (
                <div key={p.key} className={`rounded-brand border border-l-4 p-4 shadow-sm ${p.independent ? 'border-warning/40 bg-warning-soft/40' : 'border-success/40 bg-success-soft/40'}`} style={{ borderLeftColor: p.independent ? '#d97706' : '#16a34a' }}>
                  <div className="flex items-center justify-between gap-2">
                    <div><div className="text-[16px] font-semibold text-ink">{p.name}</div><div className="text-[11px] text-ink-muted">{p.role} · {p.duty}</div></div>
                    {p.independent ? <Badge tone="warning" size="sm">Independent · no approval</Badge> : <Badge tone="success" size="sm">Under control</Badge>}
                  </div>
                  <p className="mt-2 text-[11px] text-ink-muted">{p.independent ? 'All controls off — reacts independently, no approval required.' : 'Operates within the approval chain.'}</p>
                </div>
              ))}
            </div>
          </>
        );
      case 'matrix':
        return (
          <>
            <p className="mb-4 mt-1 max-w-[78ch] text-[13.5px] text-ink-muted">Turn approval on one voucher type at a time — each row independent, all off. Threshold eases in; Effective schedules it; Branch scopes it.</p>
            <div className="overflow-x-auto rounded-brand border border-surface-border bg-surface">
              <table className="w-full min-w-[720px] text-[12px]">
                <thead><tr className="bg-surface-alt text-ink-muted">{['Voucher type', 'Enforce', 'Verify', 'Approve', 'AE-approve', 'Owner co-sign', 'Threshold', 'Effective'].map((h, i) => <th key={h} className={`p-2.5 font-mono text-[9px] font-semibold uppercase tracking-wide ${i ? 'text-center' : 'text-left'}`}>{h}</th>)}</tr></thead>
                <tbody>
                  {VOUCHER_TYPES.map((t) => (
                    <tr key={t} className="border-t border-surface-border/60">
                      <td className="p-2.5 font-semibold text-ink">{t}{SENSITIVE.has(t) && <span className="ml-1.5 font-mono text-[8.5px] text-danger">sensitive</span>}</td>
                      {[0, 1, 2, 3, 4].map((c) => <td key={c} className="p-2.5 text-center"><Off /></td>)}
                      <td className="p-2.5 text-center font-mono text-[11px] text-ink-subtle">₹0</td>
                      <td className="p-2.5 text-center font-mono text-[11px] text-ink-subtle">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-[18px] flex items-start gap-2.5 rounded-[9px] border border-warning/40 bg-warning-soft px-[15px] py-3 text-[12.5px] text-warning [&_b]:font-semibold"><span>▶</span><span><b>Load-preview, Scheduled &amp; Per-branch</b> live on this row: scope a type to some branches, date it to a future day, and preview the load it routes before it engages.</span></div>
          </>
        );
      case 'limits':
        return (
          <>
            <p className="mb-4 mt-1 max-w-[78ch] text-[13.5px] text-ink-muted">The numbers that bound each power. Blank = inactive; nothing is capped until you set a value.</p>
            <div className="grid gap-3 tablet:grid-cols-2">
              {[['Escalate to Finance Manager', '₹', 'Above this, an approval must be Faiz-level.'],
                ['Dual control → Owner co-sign', '₹', 'Above this, Afshin must co-sign.'],
                ['Cash payment cap', '₹', 'Max single cash payment before escalation.'],
                ['Cash-on-hand ceiling', '₹', 'A cash receipt breaching this is flagged.'],
                ['Back-date window (days)', '', 'Older than this needs central approval.'],
                ['Decision threshold · India', '₹', 'Credit / funds decision escalates to Owner above this.'],
                ['Decision threshold · Africa', '$', 'Same, in the USD branches.'],
                ['Approval limit · per user', '₹', 'A user may approve up to this amount.']].map(([lab, cur, hint]) => (
                <div key={lab} className="rounded-brand border border-surface-border bg-surface p-3.5">
                  <div className="text-[12.5px] font-semibold text-ink">{lab}</div>
                  <div className="text-[11px] text-ink-muted">{hint}</div>
                  <div className="mt-2 flex items-center gap-2">{cur && <span className="font-mono text-[12px] text-ink-subtle">{cur}</span>}<input disabled placeholder="none" className="w-32 rounded-md border border-surface-border bg-surface-alt px-2.5 py-1.5 font-mono text-[12px] text-ink-subtle" /></div>
                </div>
              ))}
            </div>
            <div className="mt-[18px] flex items-start gap-2.5 rounded-[9px] border border-warning/40 bg-warning-soft px-[15px] py-3 text-[12.5px] text-warning [&_b]:font-semibold"><span>📐</span><span>Set these on <button className="underline" onClick={() => go('/tk/limits')}>Thresholds &amp; Limits</button> (Owner-approved). The guard already <b>enforces</b> them once set — escalate-to-FM · dual-control-to-Owner · cash caps · cash-on-hand · back-date are live checks in the policy guard.</span></div>
          </>
        );
      case 'roles':
        return (
          <>
            <p className="mb-4 mt-1 max-w-[78ch] text-[13.5px] text-ink-muted">Who can do what, by role — the intended posture. Nothing enforces until the Master Switch is on. ● full · ◐ conditional · ○ none.</p>
            <div className="overflow-x-auto rounded-brand border border-surface-border bg-surface">
              <table className="w-full min-w-[760px] text-[12px]">
                <thead><tr className="bg-surface-alt text-ink-muted">{['Role', ...CAP_COLS].map((h, i) => <th key={h} className={`p-2.5 font-mono text-[9px] font-semibold uppercase tracking-wide ${i ? 'text-center' : 'text-left'}`}>{h}</th>)}</tr></thead>
                <tbody>
                  {ROLE_CAPS.map((row) => (
                    <tr key={row.role} className="border-t border-surface-border/60">
                      <td className="p-2.5 font-semibold text-ink">{row.role}</td>
                      {row.caps.map((g, i) => <td key={i} className={`p-2.5 text-center text-[15px] font-bold ${CAP_COLOR[g]}`}>{CAP_GLYPH[g]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        );
      case 'users':
        return (
          <>
            <p className="mb-4 mt-1 max-w-[78ch] text-[13.5px] text-ink-muted">Power person-by-person — role, branch, the level they hold, whether they are under control or independent, and how fully each is set up. Switch a user on individually.</p>
            <div className="grid gap-3 tablet:grid-cols-2">
              {USERS.map((u) => (
                <div key={u.n} className="rounded-brand border border-warning/40 bg-surface p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div><div className="text-[16px] font-semibold text-ink">{u.n}</div><div className="text-[11px] text-ink-muted">{u.r} · {u.b}</div></div>
                    <Badge tone="warning" size="sm">Independent · no approval</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-muted">
                    <span>Level: <b className="text-ink">{u.lv}</b></span><span>2FA: <b className="text-ink">off</b></span><span>Setup: <b className="text-ink">{u.setup}%</b></span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-[18px] flex items-start gap-2.5 rounded-[9px] border border-warning/40 bg-warning-soft px-[15px] py-3 text-[12.5px] text-warning [&_b]:font-semibold"><span>🛡️</span><span><b>ERP (Books) login access is now gated:</b> when the master guard is on, a non-Owner granting or revoking someone's Books access is queued for the Owner instead of taking effect. CRM &amp; App toggles stay a direct control. 2FA &amp; session rules remain Planned.</span></div>
          </>
        );
      case 'rights': return <><p className="mb-4 mt-1 max-w-[78ch] text-[13.5px] text-ink-muted">Two flags you set independently here (Relocate, Hide-statements). The rest engage automatically with the master guard — <b>Via master guard</b> means a branch write already stages for Owner approval once the guard is on, so you don't wire them separately.</p><ControlList items={CONTROL_LISTS.rights} isOn={isOn} onPropose={onPropose} /></>;
      case 'sod': return <><p className="mb-4 mt-1 max-w-[78ch] text-[13.5px] text-ink-muted">Conflict rules — the same person can never both create and clear their own work. Most engage with the master guard; the branch-entry chain is its own live switch.</p><ControlList items={CONTROL_LISTS.sod} isOn={isOn} onPropose={onPropose} /></>;
      case 'security': return <><p className="mb-4 mt-1 max-w-[78ch] text-[13.5px] text-ink-muted">Session-level protection at login. Single-device sessions and password strength are <b>already enforced</b>; the Owner has decided not to adopt 2FA, login-hours or IP restrictions.</p><ControlList items={CONTROL_LISTS.security} /></>;
      case 'entry': return <><p className="mb-4 mt-1 max-w-[78ch] text-[13.5px] text-ink-muted">Guards at the point of entry and on statutory work. Mandatory-documents and reconciliation-before-close are live switches (dormant until engaged); future-date and tax-filing locks are already enforced.</p><ControlList items={CONTROL_LISTS.entry} isOn={isOn} onPropose={onPropose} /></>;
      case 'notifications': return <><p className="mb-4 mt-1 max-w-[78ch] text-[13.5px] text-ink-muted">Who is told what, and when a stale item escalates — so nothing waits unseen.</p><ControlList items={CONTROL_LISTS.notifications} /></>;
      case 'reports': return <><p className="mb-4 mt-1 max-w-[78ch] text-[13.5px] text-ink-muted">Who may export sensitive data, and the trail it leaves. These are live switches — the shared export helpers enforce them the moment you engage each flag; dormant until then.</p><ControlList items={CONTROL_LISTS.reports} isOn={isOn} onPropose={onPropose} /></>;
      case 'masters':
        return (
          <>
            <p className="mb-4 mt-1 max-w-[78ch] text-[13.5px] text-ink-muted">Who owns the chart of accounts and how a new party is brought on. These chains are the Owner's — locked, not freely editable.</p>
            <H3>Masters &amp; chart of accounts</H3>
            <div className="flex flex-wrap items-center gap-2"><ChainCard k="Maker" r="Faiz" w="creates / alters heads" /><span className="text-ink-subtle">→</span><ChainCard k="Approver" r="Afshin (Owner)" w="sole approval · all 6 branches" /><Badge tone="danger" size="sm">🔒 Locked</Badge></div>
            <H3>New party onboarding</H3>
            <div className="flex flex-wrap items-center gap-2">
              <ChainCard k="① Raise" r="Branch" w="name + reason" /><span className="text-ink-subtle">→</span>
              <ChainCard k="② KYC + limits" r="Faiz" w="PAN · bank · terms" /><span className="text-ink-subtle">→</span>
              <ChainCard k="③ Verify" r="Farhan" w="Director" /><span className="text-ink-subtle">→</span>
              <ChainCard k="④ Approve" r="Afshin" w="Owner · party goes active" />
            </div>
            <div className="mt-[18px] flex items-start gap-2.5 rounded-[9px] border border-warning/40 bg-warning-soft px-[15px] py-3 text-[12.5px] text-warning [&_b]:font-semibold"><span>🔒</span><span>Branch accountants never create parties or ledgers — they only raise a request; a party appears in branch pickers only after Afshin approves.</span></div>
            <div className="mt-[18px] flex items-start gap-2.5 rounded-[9px] border border-warning/40 bg-warning-soft px-[15px] py-3 text-[12.5px] text-warning [&_b]:font-semibold"><span>🛡️</span><span><b>Wired &amp; dormant:</b> customer &amp; supplier onboarding already routes through the master guard — a branch create / edit / delete stages for the Owner the moment the guard is engaged; today it applies inline, unchanged. Ledger heads stay locked to Faiz → Owner.</span></div>
          </>
        );
      case 'delegation':
        return (
          <>
            <p className="mb-4 mt-1 max-w-[78ch] text-[13.5px] text-ink-muted">Temporary hand-over during leave — power passes for a window, then auto-reverts. Nothing delegated now.</p>
            <div className="rounded-brand border border-surface-border bg-surface p-4 text-[12.5px] text-ink-muted">No active delegation. Example: <b className="text-ink">Faiz away 10–15 Jul → Sughra approves in his place</b>, reverting automatically. Every delegation is logged in the Change Log.</div>
          </>
        );
      case 'breakglass':
        return (
          <>
            <p className="mb-4 mt-1 max-w-[78ch] text-[13.5px] text-ink-muted">Emergency elevated access — granted for a short window with a mandatory reason, fully audited, auto-expiring. Use only when normal approval can't run.</p>
            <div className="rounded-brand border border-warning/40 bg-surface p-4 text-[12.5px] text-ink-muted">No break-glass session active. When invoked, it demands a reason, notifies the Owner immediately, and expires on a timer — every action inside the window is flagged in the audit trail.</div>
          </>
        );
      case 'erp':
        return (
          <>
            <p className="mb-4 mt-1 max-w-[78ch] text-[13.5px] text-ink-muted">How much of the ERP is configured, and how much of the money flow is secured under verification — both climb as you engage controls.</p>
            <div className="flex flex-wrap gap-3">
              <div className="min-w-[220px] flex-1 rounded-brand border border-surface-border bg-surface p-4">
                <div className="font-mono text-[10px] uppercase tracking-wide text-ink-subtle">Controls engaged</div>
                <div className="mt-1 text-4xl font-black tabular-nums text-warning">{r.pct}%</div>
                <div className="mt-1 text-[11px] text-ink-muted">{r.engaged} of {r.total} control flags on</div>
              </div>
              <div className="min-w-[220px] flex-1 rounded-brand border border-surface-border bg-surface p-4">
                <div className="font-mono text-[10px] uppercase tracking-wide text-ink-subtle">Secure &amp; under verification</div>
                <div className="mt-1 text-4xl font-black tabular-nums text-danger">{r.masterOn ? '100' : '6'}%</div>
                <div className="mt-1 text-[11px] text-ink-muted">{r.masterOn ? 'Guard engaged — enforcing' : 'Foundation locks only · master guard dormant'}</div>
              </div>
            </div>
            <div className="mt-[18px] flex items-start gap-2.5 rounded-[9px] border border-warning/40 bg-warning-soft px-[15px] py-3 text-[12.5px] text-warning [&_b]:font-semibold"><span>📈</span><span>Each control you engage lifts these — the goal is <b>100% implemented · fully secured</b>, reached when the Master Switch is on and every voucher type is enforced. Detail on <button className="underline" onClick={() => go('/tk/readiness')}>Configuration Readiness</button>.</span></div>
          </>
        );
      case 'log':
        return (
          <>
            <p className="mb-4 mt-1 max-w-[78ch] text-[13.5px] text-ink-muted">Every power change — who, when, from → to, why. Immutable. It fills as you engage controls; nothing changed yet.</p>
            <div className="rounded-brand border border-surface-border bg-surface p-6 text-center text-[12.5px] text-ink-muted">No power changes yet — this log records every toggle, grant, delegation and freeze once you begin.</div>
          </>
        );
      default: return null;
    }
  };

  const activeLabel = POWER_SCREENS.flatMap((g) => g.items).find((i) => i.key === screen)?.label || '';

  return (
    <div data-testid="tk-control-panel">
      {/* status strip */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-brand border border-warning/40 bg-warning-soft px-4 py-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-warning">Power Console</span>
        <Badge tone="warning">Everything OFF · dormant</Badge>
        <span className="text-[12px] text-warning">Nothing enforces — switch controls on one-by-one and user-by-user, at your pace.</span>
      </div>

      {msg && <div role="status" className="mb-3 rounded-brand bg-warning-soft px-3 py-2 text-xs text-warning">{msg}</div>}
      <div className="grid gap-4 desktop:grid-cols-[230px_1fr]">
        {/* nav */}
        <nav className="rounded-brand border border-surface-border bg-surface p-2" aria-label="Power Console screens">
          {POWER_SCREENS.map((grp) => (
            <div key={grp.group} className="mb-2">
              <div className="px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-ink-subtle">{grp.group}</div>
              {grp.items.map((it) => (
                <button key={it.key} onClick={() => setScreen(it.key)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg border-l-[3px] px-2.5 py-2 text-left text-[12.5px] transition-colors ${screen === it.key ? 'border-l-gold bg-navy/5 font-semibold text-navy' : 'border-l-transparent text-ink-muted hover:bg-navy/5 hover:text-navy'}`}>
                  <span className="truncate">{it.label}</span>
                  <span className="rounded-full bg-surface-alt px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase text-ink-subtle">off</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* active screen */}
        <section className="rounded-brand border border-surface-border bg-surface p-5 shadow-sm">
          <h2 className="text-[22px] font-semibold text-ink">{activeLabel}</h2>
          {screenBody()}
        </section>
      </div>
    </div>
  );
}

export default ControlPanel;
