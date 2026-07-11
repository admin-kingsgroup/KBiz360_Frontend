import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFlagState, proposeFlags, setFlag } from './api/flags';
import { withBranchToggled, isFlagOn } from './utils/flags';
import { useConfigValue } from '../../core/useAccounting';
import { isOwner } from './utils/owner';
import { toastSuccess, toastError, toastInfo } from '../../core/ux/toast';
import { confirmDialog } from '../../core/ux/confirm';
import { BranchLimitsEditor } from './BranchLimitsEditor';
import { EnforcementMatrix } from './EnforcementMatrix';
import { UserConfig } from './UserConfig';
import { ChangeLog } from './ChangeLog';
import { Delegation } from './Delegation';
import { BreakGlass } from './BreakGlass';
import { LIMIT_BRANCHES } from './utils/branchLimits';
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
const CAP_GLYPH = { full: '●', cond: '◐', none: '○' };
const CAP_COLOR = { full: 'text-success', cond: 'text-warning', none: 'text-ink-subtle' };

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

// Screens whose controls are branch-scoped — the panel branch selector shows on these.
const BRANCH_SCOPED = new Set(['master', 'approval', 'matrix', 'rights', 'sod', 'entry', 'reports', 'limits', 'users']);

export function ControlPanel({ setRoute }) {
  const [screen, setScreen] = useState('master');
  const [branch, setBranch] = useState('default');   // panel-wide branch scope for the controls
  const flagsQ = useQuery({ queryKey: ['tk', 'flags'], queryFn: getFlagState, staleTime: 30_000 });
  const verify = useConfigValue('approval.verifyEmails').data;
  const approve = useConfigValue('approval.approveEmails').data;
  const v = approvalChainView({ verifyEmails: verify, approveEmails: approve, flags: flagsQ.data });
  const r = readinessFromFlags(flagsQ.data);
  const go = (route) => setRoute && setRoute(route);
  const qc = useQueryClient();
  const [msg, setMsg] = useState('');
  const flags = flagsQ.data?.flags || {};
  // Branch-aware: reflects the selected branch's override, falling back to the global
  // value (and the whole panel scopes to `branch`).
  const isOn = (key) => isFlagOn(flagsQ.data, key, branch);
  const branchLabel = (LIMIT_BRANCHES.find((b) => b.code === branch) || {}).label || branch;
  const scoped = branch !== 'default';
  const owner = isOwner();
  // Flipping a control: the OWNER has full override, so their click applies the flag
  // LIVE (self-approved) and the toggle moves at once — the server returns the new flag
  // state, which we drop straight into the query cache. Everyone else PROPOSES the
  // change through the Owner-approved change-request flow (it never flips live for them).
  // Either way it is written to the audit trail. Dormant-safe: even an engaged flag stays
  // guarded by core.policy_guard until that master switch is itself on.
  const onPropose = async (key) => {
    const turningOn = !isOn(key);
    const where = scoped ? ` for ${branchLabel}` : '';
    // The MASTER switch engages/disengages enforcement — too consequential for a bare
    // click, so the Owner's live flip is confirmed first. Every other control stays a
    // one-click instant flip. (Non-Owners only propose.)
    if (owner && key === 'core.policy_guard') {
      const { confirmed } = await confirmDialog({
        title: turningOn ? `Engage the TK Group guard${where}?` : `Disengage the TK Group guard${where}?`,
        message: turningOn
          ? `This turns ON enforcement ${scoped ? `for ${branchLabel}` : 'across all branches'} immediately — approval chains, segregation-of-duties, cash caps, back-date limits and master-write staging all begin applying to everyone except you. You can switch it back off here at any time.`
          : `This turns OFF the control layer ${scoped ? `for ${branchLabel}` : '(all branches)'} immediately — nothing is enforced there and nobody is blocked. Individual controls keep their settings but stop applying until you re-engage the guard.`,
        danger: true,
        confirmLabel: turningOn ? 'Engage guard' : 'Disengage guard',
      });
      if (!confirmed) return;                                        // cancelled — no change, no toast
    }
    setMsg('');
    try {
      if (owner) {
        const next = await setFlag(key, turningOn, branch);         // live flip (branch-scoped) → { flags, enabled }
        qc.setQueryData(['tk', 'flags'], next);                     // toggle reflects immediately
        const lab = (next && next.flags && next.flags[key] && next.flags[key].label) || key;
        toastSuccess(`${lab}${where} — ${turningOn ? 'ON' : 'OFF'}`);
        setMsg(`“${key}”${where} is now ${turningOn ? 'ON' : 'OFF'}${turningOn && key === 'core.policy_guard' ? ` — the guard is engaged${where} and controls now enforce.` : '.'}`);
      } else {
        await proposeFlags(withBranchToggled(flagsQ.data || { flags: {} }, key, branch));
        toastInfo('Submitted for the Owner’s approval.');
        setMsg(`Change to “${key}”${where} submitted for the Owner’s approval — it applies only once approved.`);
      }
      qc.invalidateQueries({ queryKey: ['tk', 'flags'] });
    } catch (e) {
      const m = (e && e.message) || (owner ? 'Could not apply the change.' : 'Could not submit the change.');
      toastError(m);
      setMsg(m);
    }
  };

  const screenBody = () => {
    switch (screen) {
      case 'master':
        return (
          <>
            <p className="mb-4 mt-1 max-w-[78ch] text-[13.5px] text-ink-muted">The one switch that makes every other setting live. While off, this console is advisory — nobody is blocked, nothing needs approval, your migration continues untouched.</p>
            <Row nm="Engage the TK Group guard (go-live switch)"
              ds="Flip this LAST, once the other screens are set. Then everyone comes under control at once — or ramp per voucher type first."
              st="core.policy_guard" flag="core.policy_guard" on={isOn('core.policy_guard')} onPropose={onPropose} />
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
                st="Sughra verifies only" flag="approval.ae_can_approve" on={isOn('approval.ae_can_approve')} onPropose={onPropose} />
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
        return <EnforcementMatrix go={go} branch={branch} />;
      case 'limits':
        return <BranchLimitsEditor go={go} branch={branch} onBranchChange={setBranch} />;
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
        return <UserConfig go={go} branch={branch} />;
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
        return <Delegation />;
      case 'breakglass':
        return <BreakGlass />;
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
        return <ChangeLog go={go} />;
      default: return null;
    }
  };

  const activeLabel = POWER_SCREENS.flatMap((g) => g.items).find((i) => i.key === screen)?.label || '';
  const showBranchBar = BRANCH_SCOPED.has(screen);
  // The status strip reflects the selected branch ONLY on branch-scoped screens; on the
  // display-only screens it shows the global state (so it never claims "BOM scope" on a
  // screen that ignores the branch selector).
  const stripBranch = showBranchBar ? branch : 'default';
  const stripScoped = showBranchBar && scoped;
  const masterOn = isFlagOn(flagsQ.data, 'core.policy_guard', stripBranch);
  const engaged = Object.keys(flags).filter((k) => isFlagOn(flagsQ.data, k, stripBranch)).length;

  return (
    <div data-testid="tk-control-panel">
      {/* status strip — reflects the REAL flag state for the selected branch scope */}
      <div className={`mb-4 flex flex-wrap items-center gap-3 rounded-brand border px-4 py-2.5 ${masterOn ? 'border-danger/40 bg-danger-soft' : 'border-warning/40 bg-warning-soft'}`}>
        <span className={`text-[11px] font-bold uppercase tracking-wide ${masterOn ? 'text-danger' : 'text-warning'}`}>Power Console</span>
        <Badge tone={masterOn ? 'danger' : 'warning'}>
          {masterOn ? 'Guard engaged · enforcing' : engaged > 0 ? `${engaged} control${engaged > 1 ? 's' : ''} on · guard dormant` : 'Everything OFF · dormant'}
        </Badge>
        <span className={`text-[12px] ${masterOn ? 'text-danger' : 'text-warning'}`}>
          {stripScoped ? <><b>{branchLabel}</b> scope · </> : null}
          {masterOn ? `The TK Group guard is on${stripScoped ? ` for ${branchLabel}` : ''} — these controls now enforce.`
            : owner ? 'Flip any switch to engage it live — your change applies immediately and is logged.'
            : 'Nothing enforces — switch controls on one-by-one and user-by-user, at your pace.'}
        </span>
        <button type="button" onClick={() => go('/tk/rules')}
          className="ml-auto shrink-0 rounded-full border border-surface-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink-muted hover:bg-navy/5 hover:text-navy">
          📖 Rule Book
        </button>
      </div>

      {/* branch scope selector — every control below applies to the chosen branch */}
      {showBranchBar && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-brand border border-surface-border bg-surface-alt px-3 py-2">
          <span className="mr-1 font-mono text-[9.5px] font-semibold uppercase tracking-wide text-ink-subtle">Applies to</span>
          {LIMIT_BRANCHES.map((b) => {
            const active = branch === b.code;
            return (
              <button key={b.code} type="button" onClick={() => setBranch(b.code)}
                className={`rounded-full border px-3 py-1 text-[11.5px] transition-colors ${active ? 'border-navy bg-navy text-white font-semibold' : 'border-surface-border text-ink-muted hover:bg-navy/5'}`}>
                {b.label}{b.code !== 'default' && <span className={`ml-1 font-mono text-[9px] ${active ? 'text-white/70' : 'text-ink-subtle'}`}>{b.ccy}</span>}
              </button>
            );
          })}
          {scoped && <span className="ml-1 text-[11px] text-ink-muted">— overrides fall back to <b>Group default</b> where unset.</span>}
        </div>
      )}

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
