import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFlagState, proposeFlags, setFlag, setManyFlags } from '../api/flags';
import { withBranchToggled, isFlagOn } from '../utils/flags';
import { useConfigValue } from '../../../core/useAccounting';
import { isOwner } from '../utils/owner';
import { toastSuccess, toastError, toastInfo } from '../../../core/ux/toast';
import { confirmDialog } from '../../../core/ux/confirm';
import { BranchLimitsEditor } from '../BranchLimitsEditor';
import { EnforcementMatrix } from '../EnforcementMatrix';
import { PolicyTester } from '../PolicyTester';
import { ActiveControls } from '../ActiveControls';
import { DailyDigest } from '../DailyDigest';
import { UserConfig } from '../UserConfig';
import { ChangeLog } from '../ChangeLog';
import { Delegation } from '../Delegation';
import { BreakGlass } from '../BreakGlass';
import { LIMIT_BRANCHES } from '../utils/branchLimits';
import { approvalChainView, POWER_SCREENS, CAP_COLS, ROLE_CAPS, ROLE_SWITCHES, verifyApproveOverlap, roleControlWarning, DEFAULT_RULES, CONFIGURABLE_GROUPS, CONFIGURABLE_FLAGS, DECLINED_RULES } from '../utils/controlPanel';
import { Badge } from '../../../shell/primitives';

// ─── TK GROUP CENTRAL · Control Panel ────────────────────────────────────────
// Two rule screens — DEFAULT RULES (always-on foundation locks, read-only) and
// CONFIGURABLE RULES (the Owner's ON/OFF switches, grouped) — plus the enforcement
// tools and reference/oversight screens. There is NO master switch: enforcement
// engages rule-by-rule (with an Enable-all / Disable-all bulk action). Everything ships
// OFF (dormant) and the always-on foundation rules apply on day one.
const CAP_GLYPH = { full: '●', cond: '◐', none: '○' };
const CAP_COLOR = { full: 'text-success', cond: 'text-warning', none: 'text-ink-subtle' };

const H3 = ({ children }) => <h3 className="mb-2 mt-5 text-[15px] font-semibold text-ink">{children}</h3>;
// Interactive switch — the Owner flips it live; everyone else proposes the change.
// Off = grey, On = teal (crit = red for money controls).
function Toggle({ on, crit, onClick, label }) {
  return (
    <button type="button" role="switch" aria-checked={!!on} aria-label={label} onClick={onClick}
      className={`relative h-[24px] w-[42px] shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 ${on ? (crit ? 'bg-danger' : 'bg-success') : 'bg-surface-border'}`}>
      <span className="absolute top-[2.5px] h-[19px] w-[19px] rounded-full bg-white shadow transition-all" style={{ left: on ? 20 : 2.5 }} />
    </button>
  );
}
// A configurable rule row — the toggle proposes (or, for the Owner, flips live).
function SwitchRow({ nm, ds, flag, on, crit, onPropose }) {
  const accentColor = on ? (crit ? '#dc2626' : '#16a34a') : '#cdd1d8';
  return (
    <div className="flex items-start gap-3 rounded-brand border border-l-4 border-surface-border bg-surface p-3.5 shadow-sm transition-colors" style={{ borderLeftColor: accentColor }}>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold text-ink">{nm}</div>
        {ds && <div className="mt-0.5 text-[11.5px] text-ink-muted">{ds}</div>}
        <div className={`mt-2 inline-block rounded-full px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wide ${on ? (crit ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success') : 'bg-surface-alt text-ink-subtle'}`}>
          {on ? 'On' : 'Off'} · {flag}
        </div>
      </div>
      <Toggle on={on} crit={crit} label={nm} onClick={() => onPropose && onPropose(flag)} />
    </div>
  );
}
// A default (always-on) rule — read-only, never a toggle.
function DefaultRow({ nm, ds }) {
  return (
    <div className="flex items-start gap-3 rounded-brand border border-l-4 border-surface-border bg-surface p-3.5 shadow-sm" style={{ borderLeftColor: '#16a34a' }}>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold text-ink">{nm}</div>
        {ds && <div className="mt-0.5 text-[11.5px] text-ink-muted">{ds}</div>}
      </div>
      <Badge tone="success" size="sm">🔒 Always on</Badge>
    </div>
  );
}
// Check → Verify → Approve reads as a pipeline, so each level gets its own accent.
const CHAIN_COLORS = ['#2563eb', '#d97706', '#16a34a'];
function ChainCard({ k, r, w, n }) {
  const color = CHAIN_COLORS[((n || 1) - 1) % CHAIN_COLORS.length] || '#5b616e';
  return (
    <div className="min-w-[170px] flex-1 rounded-brand border border-t-4 border-surface-border bg-surface p-3.5 shadow-sm" style={{ borderTopColor: color }}>
      {n != null && <div className="flex items-center gap-1.5"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: color }}>{n}</span><div className="font-mono text-[9.5px] uppercase tracking-wide text-ink-subtle">{k}</div></div>}
      {n == null && <div className="font-mono text-[9.5px] uppercase tracking-wide text-ink-subtle">{k}</div>}
      <div className="mt-1.5 text-[15px] font-semibold text-ink">{r}</div>
      <div className="truncate text-[11px] text-ink-muted">{w}</div>
    </div>
  );
}

// The role flags map back to a ROLE_SWITCHES key so the Approval group can show the
// deadlock guardrail under the right rows.
const ROLE_FLAG_KEY = Object.fromEntries(ROLE_SWITCHES.map((rs) => [rs.flag, rs.key]));

// Screens whose controls are branch-scoped — the panel branch selector shows on these.
// (roles + masters render static content that ignores branch, so no selector there.)
const BRANCH_SCOPED = new Set(['configurable', 'matrix', 'limits', 'users']);
// Nav pill: the Configurable screen shows a real "N on" count of its flags for the branch.
const SCREEN_FLAGS = { configurable: CONFIGURABLE_FLAGS };

export function ControlPanel({ setRoute }) {
  const [screen, setScreen] = useState('defaults');
  const [branch, setBranch] = useState('default');   // panel-wide branch scope for the controls
  const flagsQ = useQuery({ queryKey: ['tk', 'flags'], queryFn: getFlagState, staleTime: 30_000 });
  const verify = useConfigValue('approval.verifyEmails').data;
  const approve = useConfigValue('approval.approveEmails').data;
  const v = approvalChainView({ verifyEmails: verify, approveEmails: approve, flags: flagsQ.data });
  const go = (route) => setRoute && setRoute(route);
  const qc = useQueryClient();
  const [msg, setMsg] = useState('');
  const flags = flagsQ.data?.flags || {};
  // Branch-aware: reflects the selected branch's override, falling back to the global value.
  const isOn = (key) => isFlagOn(flagsQ.data, key, branch);
  const branchLabel = (LIMIT_BRANCHES.find((b) => b.code === branch) || {}).label || branch;
  const scoped = branch !== 'default';
  const owner = isOwner();

  // Flipping a control: the OWNER has full override, so their click applies the flag LIVE
  // (self-approved) and the toggle moves at once. Everyone else PROPOSES the change through
  // the Owner-approved change-request flow. Either way it is written to the audit trail.
  // There is no master switch, so no rule needs a special confirm — every flip is one click.
  const onPropose = async (key) => {
    const turningOn = !isOn(key);
    const where = scoped ? ` for ${branchLabel}` : '';
    setMsg('');
    try {
      if (owner) {
        const next = await setFlag(key, turningOn, branch);         // live flip (branch-scoped)
        qc.setQueryData(['tk', 'flags'], next);
        const lab = (next && next.flags && next.flags[key] && next.flags[key].label) || key;
        toastSuccess(`${lab}${where} — ${turningOn ? 'ON' : 'OFF'}`);
        setMsg(`“${key}”${where} is now ${turningOn ? 'ON' : 'OFF'}.`);
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

  // Enable-all / Disable-all — OWNER only, one request over every configurable flag for the
  // current branch scope. This is the go-live / rollback that used to be the master switch.
  const onBulk = async (enable) => {
    const label = enable ? 'Enable all' : 'Disable all';
    const where = scoped ? ` for ${branchLabel}` : '';
    const { confirmed } = await confirmDialog({
      title: `${label} configurable rules${where}?`,
      message: enable
        ? `This switches ON all ${CONFIGURABLE_FLAGS.length} configurable rules ${scoped ? `for ${branchLabel}` : 'across the Group default'} in one action. Each still applies only to the entries it governs, and the always-on foundation rules are unaffected. You can switch any back off individually.`
        : `This switches OFF all ${CONFIGURABLE_FLAGS.length} configurable rules ${scoped ? `for ${branchLabel}` : '(Group default)'} — enforcement returns to the always-on foundation rules only. Reversible any time.`,
      danger: !enable,
      confirmLabel: label,
    });
    if (!confirmed) return;
    setMsg('');
    try {
      const changes = CONFIGURABLE_FLAGS.map((key) => ({ key, enabled: enable, branch }));
      const next = await setManyFlags(changes);
      if (next && next.flags) qc.setQueryData(['tk', 'flags'], next);
      toastSuccess(`${label}${where} — ${CONFIGURABLE_FLAGS.length} rules ${enable ? 'ON' : 'OFF'}`);
      setMsg(`${label}: ${CONFIGURABLE_FLAGS.length} configurable rules ${enable ? 'ON' : 'OFF'}${where}.`);
      qc.invalidateQueries({ queryKey: ['tk', 'flags'] });
    } catch (e) {
      const m = (e && e.message) || 'Could not apply the bulk change.';
      toastError(m);
      setMsg(m);
    }
  };

  const renderConfigGroup = (grp) => {
    const isApproval = grp.group === 'Approval & Verification';
    const overlap = isApproval ? verifyApproveOverlap(v) : [];
    return (
      <div key={grp.group}>
        <H3>{grp.group}</H3>
        {isApproval && overlap.length > 0 && (
          <div className="mb-2 flex items-start gap-2 rounded-brand border border-danger/40 bg-danger-soft px-3 py-2 text-[12px] text-danger">
            <span>⚠</span>
            <span><b>Segregation-of-duties conflict:</b> {overlap.join(', ')} {overlap.length > 1 ? 'are' : 'is'} in <b>both</b> the Verify and Approve lists — the same person could verify AND give final approval on their own voucher.</span>
          </div>
        )}
        <div className="grid gap-2.5 tablet:grid-cols-2">
          {grp.items.map((c) => {
            const roleKey = ROLE_FLAG_KEY[c.flag];
            const warn = roleKey ? roleControlWarning(roleKey, v) : null;
            return (
              <div key={c.flag}>
                <SwitchRow {...c} on={isOn(c.flag)} onPropose={onPropose} />
                {warn && isOn(c.flag) && <div className="mt-1 flex items-start gap-1.5 rounded-md border border-warning/40 bg-warning-soft px-2.5 py-1.5 text-[11px] text-warning"><span>⚠</span><span>{warn}</span></div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const screenBody = () => {
    switch (screen) {
      case 'defaults':
        return (
          <>
            <p className="mb-4 mt-1 max-w-[80ch] text-[13.5px] text-ink-muted">The foundation locks that are <b>always enforced</b> and can’t be switched off — they apply on day one, before you engage anything else. Read-only.</p>
            <div className="grid gap-2.5 tablet:grid-cols-2">{DEFAULT_RULES.map((r, i) => <DefaultRow key={i} {...r} />)}</div>
          </>
        );
      case 'configurable':
        return (
          <>
            <p className="mb-4 mt-1 max-w-[80ch] text-[13.5px] text-ink-muted">The rules you switch on one-by-one{scoped ? <> for <b>{branchLabel}</b></> : ''}. Each is independent — there is no master switch. {owner ? 'Flip any switch to apply it live.' : 'Changes are submitted for the Owner’s approval.'}</p>
            {owner && (
              <div className="mb-4 flex flex-wrap items-center gap-2 rounded-brand border border-surface-border bg-surface-alt px-3 py-2">
                <span className="mr-1 font-mono text-[9.5px] font-semibold uppercase tracking-wide text-ink-subtle">Bulk{scoped ? ` · ${branchLabel}` : ''}</span>
                <button type="button" onClick={() => onBulk(true)} className="rounded-full border border-success/50 bg-success-soft px-3 py-1 text-[11.5px] font-semibold text-success hover:bg-success/10">Enable all</button>
                <button type="button" onClick={() => onBulk(false)} className="rounded-full border border-surface-border bg-surface px-3 py-1 text-[11.5px] font-semibold text-ink-muted hover:bg-danger-soft hover:text-danger">Disable all</button>
                <span className="ml-1 text-[11px] text-ink-muted">applies to all {CONFIGURABLE_FLAGS.length} configurable rules — your go-live / rollback in one action.</span>
              </div>
            )}
            {CONFIGURABLE_GROUPS.map(renderConfigGroup)}
            <div className="mt-6 rounded-brand border border-surface-border bg-surface-alt/60 p-3.5">
              <div className="font-mono text-[9.5px] uppercase tracking-wide text-ink-subtle">Considered &amp; declined (Owner’s decision — not adopted)</div>
              <div className="mt-1.5 grid gap-1.5 tablet:grid-cols-2">
                {DECLINED_RULES.map((d, i) => <div key={i} className="text-[11.5px] text-ink-subtle"><b className="text-ink-muted">{d.nm}</b> — {d.ds}</div>)}
              </div>
            </div>
          </>
        );
      case 'matrix': return <EnforcementMatrix go={go} branch={branch} />;
      case 'tester': return <PolicyTester branch={branch} />;
      case 'active': return <ActiveControls />;
      case 'digest': return <DailyDigest go={go} />;
      case 'limits': return <BranchLimitsEditor go={go} branch={branch} onBranchChange={setBranch} />;
      case 'users': return <UserConfig go={go} branch={branch} />;
      case 'delegation': return <Delegation />;
      case 'breakglass': return <BreakGlass />;
      case 'log': return <ChangeLog go={go} />;
      case 'roles':
        return (
          <>
            <p className="mb-4 mt-1 max-w-[78ch] text-[13.5px] text-ink-muted">Who can do what, by role — the intended posture. ● full · ◐ conditional · ○ none.</p>
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
      case 'masters':
        return (
          <>
            <p className="mb-4 mt-1 max-w-[78ch] text-[13.5px] text-ink-muted">Who owns the chart of accounts and how a new party is brought on. These chains are the Owner’s — locked, not freely editable. Engage the branch-write staging on the <button className="underline" onClick={() => setScreen('configurable')}>Configurable Rules</button> screen (Masters &amp; Locks).</p>
            <H3>Masters &amp; chart of accounts</H3>
            <div className="flex flex-wrap items-center gap-2"><ChainCard k="Maker" r="Faiz" w="creates / alters heads" /><span className="text-ink-subtle">→</span><ChainCard k="Approver" r="Afshin (Owner)" w="sole approval · all 6 branches" /><Badge tone="danger" size="sm">🔒 Locked</Badge></div>
            <H3>New party onboarding</H3>
            <div className="flex flex-wrap items-center gap-2">
              <ChainCard k="① Raise" r="Branch" w="name + reason" /><span className="text-ink-subtle">→</span>
              <ChainCard k="② KYC + limits" r="Faiz" w="PAN · bank · terms" /><span className="text-ink-subtle">→</span>
              <ChainCard k="③ Verify" r="Farhan" w="Director" /><span className="text-ink-subtle">→</span>
              <ChainCard k="④ Approve" r="Afshin" w="Owner · party goes active" />
            </div>
            <div className="mt-[18px] flex items-start gap-2.5 rounded-[9px] border border-warning/40 bg-warning-soft px-[15px] py-3 text-[12.5px] text-warning [&_b]:font-semibold"><span>🔒</span><span>Branch accountants never create parties or ledgers — they only raise a request; a party appears in branch pickers only after Afshin approves. Turn on <b>Master-creation lock</b> (Configurable Rules) to stage branch master writes for the Owner.</span></div>
          </>
        );
      default: return null;
    }
  };

  const activeLabel = POWER_SCREENS.flatMap((g) => g.items).find((i) => i.key === screen)?.label || '';
  const showBranchBar = BRANCH_SCOPED.has(screen);
  // The status strip reflects the selected branch only on branch-scoped screens.
  const stripBranch = showBranchBar ? branch : 'default';
  const stripScoped = showBranchBar && scoped;
  const engaged = CONFIGURABLE_FLAGS.filter((k) => isFlagOn(flagsQ.data, k, stripBranch)).length;

  return (
    <div data-testid="tk-control-panel">
      {/* status strip — reflects the REAL configurable-flag state for the selected scope */}
      <div className={`mb-4 flex flex-wrap items-center gap-3 rounded-brand border px-4 py-2.5 ${engaged > 0 ? 'border-success/40 bg-success-soft' : 'border-warning/40 bg-warning-soft'}`}>
        <span className={`text-[11px] font-bold uppercase tracking-wide ${engaged > 0 ? 'text-success' : 'text-warning'}`}>Control Panel</span>
        <Badge tone={engaged > 0 ? 'success' : 'warning'}>
          {engaged > 0 ? `${engaged} control${engaged > 1 ? 's' : ''} on` : 'Everything OFF · dormant'}
        </Badge>
        <span className={`text-[12px] ${engaged > 0 ? 'text-success' : 'text-warning'}`}>
          {stripScoped ? <><b>{branchLabel}</b> scope · </> : null}
          {owner ? 'Flip any switch to apply it live — your change applies immediately and is logged.'
            : 'Nothing enforces beyond the always-on defaults — switch rules on one-by-one, at your pace.'}
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
        <nav className="rounded-brand border border-surface-border bg-surface p-2" aria-label="Control Panel screens">
          {POWER_SCREENS.map((grp) => (
            <div key={grp.group} className="mb-2">
              <div className="px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-ink-subtle">{grp.group}</div>
              {grp.items.map((it) => {
                const keys = SCREEN_FLAGS[it.key];
                const onN = keys ? keys.filter((k) => isOn(k)).length : null;
                return (
                  <button key={it.key} onClick={() => setScreen(it.key)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg border-l-[3px] px-2.5 py-2 text-left text-[12.5px] transition-colors ${screen === it.key ? 'border-l-gold bg-navy/5 font-semibold text-navy' : 'border-l-transparent text-ink-muted hover:bg-navy/5 hover:text-navy'}`}>
                    <span className="truncate">{it.label}</span>
                    {onN === null ? null : onN > 0
                      ? <span className="rounded-full bg-success-soft px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase text-success">{onN} on</span>
                      : <span className="rounded-full bg-surface-alt px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase text-ink-subtle">off</span>}
                  </button>
                );
              })}
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
