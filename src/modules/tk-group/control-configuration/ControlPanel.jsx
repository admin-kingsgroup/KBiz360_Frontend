import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFlagState, proposeFlags, setFlag, setManyFlags, flagImpact } from '../api/flags';
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
import { AuthorityAdmin } from './AuthorityAdmin';
import { RatesReference } from './RatesReference';
import { LIMIT_BRANCHES } from '../utils/branchLimits';
import { approvalChainView, POWER_SCREENS, CAP_COLS, ROLE_CAPS, ROLE_SWITCHES, verifyApproveOverlap, roleControlWarning, engageCautions, DEFAULT_RULES, CONFIGURABLE_GROUPS, CONFIGURABLE_FLAGS, DECLINED_RULES, postureGrid, POSTURE_PRESETS, presetChanges, copyBranchChanges, resetBranchChanges, lawBand } from '../utils/controlPanel';
import { lockedLawBook } from '../utils/ruleBook.data';
import { Badge } from '../../../shell/primitives';
import { isViewOnly, VIEW_ONLY_REASON, apiGet } from '../../../core/api';

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
  // View-only accounts may review the posture but never flip a control — the switch is
  // pre-disabled with the shared reason, never a live toggle that only 403s on the server.
  const vo = isViewOnly();
  return (
    <button type="button" role="switch" aria-checked={!!on} aria-label={label} onClick={onClick}
      disabled={vo} title={vo ? VIEW_ONLY_REASON : undefined}
      className={`relative h-[24px] w-[42px] shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 ${on ? (crit ? 'bg-danger' : 'bg-success') : 'bg-surface-border'} ${vo ? 'cursor-not-allowed opacity-50' : ''}`}>
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
// One track of the ERP-Law band: a domain roll-up (name + law count), each row opening the
// full rules in the Rule Book. Read-only — laws are shown, never switched.
function LawGroup({ title, sub, rows, count, onOpen }) {
  return (
    <div className="overflow-hidden rounded-brand border border-surface-border bg-surface shadow-sm">
      <div className="flex items-center gap-2 border-b border-surface-border bg-surface-alt px-3.5 py-2.5">
        <span className="text-[13px] font-semibold text-ink">{title}</span>
        <span className="ml-auto font-mono text-[10px] font-bold uppercase tracking-wide text-ink-subtle">{rows.length} domains · {count} laws</span>
      </div>
      {rows.length === 0 ? (
        <div className="px-3.5 py-4 text-[12px] text-ink-subtle">No {sub} laws in the registry yet.</div>
      ) : rows.map((d) => (
        <button key={d.id} type="button" onClick={onOpen} title="Open in the Rule Book"
          className="flex w-full items-center gap-3 border-t border-surface-border/60 px-3.5 py-2 text-left first:border-t-0 hover:bg-navy/5">
          <span className="w-10 shrink-0 font-mono text-[10px] font-bold text-accent/80">{d.id}</span>
          <span className="flex-1 truncate text-[12.5px] text-ink">{d.title}</span>
          <Badge tone="neutral" size="sm">{d.count}</Badge>
          <span className="text-[11px] text-ink-subtle">→</span>
        </button>
      ))}
    </div>
  );
}
// Data-provenance line for the law bands — live registry / loading / bundled fallback.
function LawState({ q }) {
  const live = !!(q.data && q.data.items && q.data.items.length);
  return (
    <p className="mb-4 flex items-center gap-1.5 text-[11px]">
      {live
        ? <><span className="inline-block h-2 w-2 rounded-full bg-success" /><span className="text-ink-subtle">Live from the rules registry (<code>/api/rules</code>).</span></>
        : q.isLoading
          ? <><span className="inline-block h-2 w-2 animate-pulse rounded-full bg-ink-subtle" /><span className="text-ink-subtle">Loading the live registry…</span></>
          : <><span className="inline-block h-2 w-2 rounded-full bg-warning" /><span className="text-ink-subtle">Showing the built-in reference copy — the live registry didn’t load, so counts may lag the server.</span></>}
    </p>
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

// One cell of the All-Branches Grid: ✓ on / · off, with a SOLID fill when the branch carries
// an explicit override and a soft/faded fill when it inherits the Group default — so drift is
// obvious at a glance. crit (money control) turns an ON override red. Click to flip that
// branch's value (Owner live-flips; others propose).
function GridCell({ cell, crit, onClick, label }) {
  const { on, override } = cell || {};
  // A view-only account can read the grid but never flip a cell — disabled with the reason.
  const vo = isViewOnly();
  const cls = on
    ? (override ? (crit ? 'bg-danger text-white' : 'bg-success text-white') : (crit ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success'))
    : (override ? 'bg-surface-alt text-ink-muted ring-1 ring-inset ring-surface-border' : 'bg-surface text-ink-subtle');
  return (
    <button type="button" onClick={onClick} aria-label={label} disabled={vo} title={vo ? VIEW_ONLY_REASON : label}
      className={`flex h-7 w-7 items-center justify-center rounded-md text-[12px] font-bold transition-colors hover:opacity-80 ${cls} ${vo ? 'cursor-not-allowed opacity-50' : ''}`}>
      {on ? '✓' : '·'}
    </button>
  );
}

// The role flags map back to a ROLE_SWITCHES key so the Approval group can show the
// deadlock guardrail under the right rows.
const ROLE_FLAG_KEY = Object.fromEntries(ROLE_SWITCHES.map((rs) => [rs.flag, rs.key]));
// A flag key → its human switch name, for confirm-dialog titles.
const CONFIG_FLAG_NAME = Object.fromEntries(CONFIGURABLE_GROUPS.flatMap((g) => g.items).map((i) => [i.flag, i.nm]));

// Screens whose controls are branch-scoped — the panel branch selector shows on these.
// (roles + masters render static content that ignores branch, so no selector there.)
const BRANCH_SCOPED = new Set(['configurable', 'matrix', 'limits', 'users']);
// Nav pill: the Configurable screen shows a real "N on" count of its flags for the branch.
const SCREEN_FLAGS = { configurable: CONFIGURABLE_FLAGS };

export function ControlPanel({ setRoute }) {
  const [screen, setScreen] = useState('law-erp');
  const [branch, setBranch] = useState('default');   // panel-wide branch scope for the controls
  const flagsQ = useQuery({ queryKey: ['tk', 'flags'], queryFn: getFlagState, staleTime: 30_000 });
  // Plane ① · ERP Law band — read the enforced-rule registry (same key/fallback as the Rule
  // Book, so both agree). regroupRegistry(null) → null → the bundled RULE_BOOK, so the band is
  // never empty even if the endpoint is cold/unavailable.
  const lawQ = useQuery({ queryKey: ['tk', 'rules-registry'], queryFn: () => apiGet('/api/rules').catch(() => null), staleTime: 300_000 });
  const lawBook = useMemo(() => lockedLawBook(lawQ.data?.items), [lawQ.data]);
  const band = useMemo(() => lawBand(lawBook), [lawBook]);
  const verify = useConfigValue('approval.verifyEmails').data;
  const approve = useConfigValue('approval.approveEmails').data;
  const v = approvalChainView({ verifyEmails: verify, approveEmails: approve, flags: flagsQ.data });
  const go = (route) => setRoute && setRoute(route);
  const qc = useQueryClient();
  const [msg, setMsg] = useState('');
  const [msgTone, setMsgTone] = useState('info');
  // Set the inline status line WITH its tone (success / info / warning / error) so a success
  // message isn't rendered as a warning. Clearing (setMsg('')) hides the strip, so tone is moot.
  const say = (text, tone = 'info') => { setMsg(text); setMsgTone(tone); };
  // Copy source = a REAL branch (not Group default — pushing the global as explicit overrides
  // is a footgun; use Reset-to-inherit for that). Defaults to the first real branch.
  const [copySource, setCopySource] = useState(() => (LIMIT_BRANCHES.find((b) => b.code !== 'default') || {}).code || 'default');
  const [impacts, setImpacts] = useState({});                // { flagKey: impact result } — the preview cache
  const [previewing, setPreviewing] = useState('');          // flagKey currently being previewed
  const flags = flagsQ.data?.flags || {};
  // Branch-aware: reflects the selected branch's override, falling back to the global value.
  const isOn = (key) => isFlagOn(flagsQ.data, key, branch);
  const branchLabel = (LIMIT_BRANCHES.find((b) => b.code === branch) || {}).label || branch;
  const scoped = branch !== 'default';
  const owner = isOwner();
  // View-only accounts (incl. a view-only Owner) may review every screen but apply NOTHING —
  // the owner-only bulk / preset / copy / reset actions are layered with this on top of the
  // isOwner() gate so a view-only user can neither apply nor propose.
  const vo = isViewOnly();

  // Flip a single control for a SPECIFIC scope (`targetBranch`: a branch code, or
  // 'default'/'ALL'/'' for the Group global). The OWNER applies it LIVE (self-approved) and
  // the toggle moves at once; everyone else PROPOSES it through the Owner-approved
  // change-request flow. Either way it is audited. No master switch, so no rule needs a
  // special confirm — every flip is one click. Shared by the Configurable screen (panel
  // branch) and the All-Branches Grid (per-cell branch).
  const flipFor = async (key, targetBranch) => {
    const turningOn = !isFlagOn(flagsQ.data, key, targetBranch);
    const isDef = !targetBranch || targetBranch === 'default' || targetBranch === 'ALL';
    const bLabel = (LIMIT_BRANCHES.find((b) => b.code === targetBranch) || {}).label || targetBranch;
    const where = isDef ? '' : ` for ${bLabel}`;
    setMsg('');
    try {
      if (owner) {
        // A live flip is one click — EXCEPT when engaging it creates a real hazard (an FM/AE
        // approval deadlock, or the Branch-Accountant CRM lock that stops branch refunds). Then
        // preview the caution and let the Owner confirm before it goes live. Non-hazard flags
        // (and every turn-OFF) stay one-click, so nothing else grows a confirm step.
        const cautions = turningOn ? engageCautions([key], v) : [];
        if (cautions.length) {
          const { confirmed } = await confirmDialog({
            title: `Turn on “${CONFIG_FLAG_NAME[key] || key}”${where}?`,
            message: `${cautions.map((c) => `⚠ ${c.text}`).join('\n\n')}\n\nThis applies live immediately. Turn it on anyway?`,
            danger: true,
            confirmLabel: 'Turn on anyway',
          });
          if (!confirmed) { say('Left unchanged.', 'info'); return; }
        }
        const next = await setFlag(key, turningOn, targetBranch);   // live flip (scoped)
        qc.setQueryData(['tk', 'flags'], next);
        const lab = (next && next.flags && next.flags[key] && next.flags[key].label) || key;
        toastSuccess(`${lab}${where} — ${turningOn ? 'ON' : 'OFF'}`);
        say(`“${key}”${where} is now ${turningOn ? 'ON' : 'OFF'}.`, 'success');
      } else {
        await proposeFlags(withBranchToggled(flagsQ.data || { flags: {} }, key, targetBranch));
        toastInfo('Submitted for the Owner’s approval.');
        say(`Change to “${key}”${where} submitted for the Owner’s approval — it applies only once approved.`, 'info');
      }
      qc.invalidateQueries({ queryKey: ['tk', 'flags'] });
    } catch (e) {
      const m = (e && e.message) || (owner ? 'Could not apply the change.' : 'Could not submit the change.');
      toastError(m);
      say(m, 'error');
    }
  };
  // Configurable screen flips against the panel-selected branch scope.
  const onPropose = (key) => flipFor(key, branch);

  // Apply a batch of {key,enabled,branch} changes via the bulk endpoint (OWNER-only) and
  // refresh the cache. Shared by Enable-all/Disable-all, presets, and copy-across-branches.
  const applyBulk = async (changes, label) => {
    setMsg('');
    if (!changes.length) { say('Nothing to change.', 'info'); return; }
    try {
      const next = await setManyFlags(changes);
      if (next && next.flags) qc.setQueryData(['tk', 'flags'], next);
      toastSuccess(`${label} — applied (${changes.length} settings)`);
      say(`${label} — applied (${changes.length} settings).`, 'success');
      qc.invalidateQueries({ queryKey: ['tk', 'flags'] });
    } catch (e) {
      const m = (e && e.message) || 'Could not apply the bulk change.';
      toastError(m);
      say(m, 'error');
    }
  };

  // A confirm-message suffix listing the hazards a set of flags will engage (deadlock /
  // Branch-Accountant refund lock) — so a bulk go-live surfaces the same cautions the
  // per-switch screen shows inline, instead of a silent one-click into a latent deadlock.
  const cautionSuffix = (enablingKeys) => {
    const cautions = engageCautions(enablingKeys, v);
    return cautions.length ? `\n\n⚠ Before you engage this:\n${cautions.map((c) => `• ${c.text}`).join('\n')}` : '';
  };

  // Enable-all / Disable-all — OWNER only, one request over every configurable flag for the
  // current branch scope. This is the go-live / rollback that used to be the master switch.
  const onBulk = async (enable) => {
    const label = enable ? 'Enable all' : 'Disable all';
    const where = scoped ? ` for ${branchLabel}` : '';
    const { confirmed } = await confirmDialog({
      title: `${label} configurable rules${where}?`,
      message: enable
        ? `This switches ON all ${CONFIGURABLE_FLAGS.length} configurable rules ${scoped ? `for ${branchLabel}` : 'across the Group default'} in one action. Each still applies only to the entries it governs, and the always-on foundation rules are unaffected. You can switch any back off individually.${cautionSuffix(CONFIGURABLE_FLAGS)}`
        : `This switches OFF all ${CONFIGURABLE_FLAGS.length} configurable rules ${scoped ? `for ${branchLabel}` : '(Group default)'} — enforcement returns to the always-on foundation rules only. Reversible any time.`,
      danger: !enable,
      confirmLabel: label,
    });
    if (!confirmed) return;
    await applyBulk(CONFIGURABLE_FLAGS.map((key) => ({ key, enabled: enable, branch })), `${label}${where}`);
  };

  // Apply a named posture preset (Conservative / Standard / Strict) to the current scope —
  // sets the preset's flags ON and every other configurable rule OFF, in one action.
  const onApplyPreset = async (preset) => {
    const where = scoped ? ` for ${branchLabel}` : ' (Group default)';
    const { confirmed } = await confirmDialog({
      title: `Apply the “${preset.label}” preset${scoped ? ` to ${branchLabel}` : ''}?`,
      message: `${preset.desc} This sets those ${preset.flags.length} rule${preset.flags.length > 1 ? 's' : ''} ON and every other configurable rule OFF${where}. Reversible — adjust any rule after.${cautionSuffix(preset.flags)}`,
      danger: false,
      confirmLabel: `Apply ${preset.label}`,
    });
    if (!confirmed) return;
    await applyBulk(presetChanges(preset, branch), `“${preset.label}” preset${where}`);
  };

  // Copy the source branch's configurable posture onto every OTHER real branch.
  const onCopyConfig = async () => {
    const targets = LIMIT_BRANCHES.filter((b) => b.code !== 'default' && b.code !== copySource).map((b) => b.code);
    const srcLabel = (LIMIT_BRANCHES.find((b) => b.code === copySource) || {}).label || copySource;
    const changes = copyBranchChanges(flagsQ.data, copySource, targets);
    const enablingKeys = [...new Set(changes.filter((c) => c.enabled === true).map((c) => c.key))];
    const { confirmed } = await confirmDialog({
      title: `Copy ${srcLabel}’s rules to the other ${targets.length} branches?`,
      message: `Every configurable rule’s effective value from ${srcLabel} is applied to ${targets.join(', ')}. Reversible per branch.${cautionSuffix(enablingKeys)}`,
      danger: false,
      confirmLabel: 'Copy config',
    });
    if (!confirmed) return;
    await applyBulk(changes, `${srcLabel}’s config → ${targets.length} branches`);
  };

  // Reset a branch to the Group default — clear every configurable override so it inherits
  // the global value again (the path back from override → inherit). OWNER only.
  const onResetBranch = async (targetBranch) => {
    if (!targetBranch || targetBranch === 'default') return;
    const bLabel = (LIMIT_BRANCHES.find((b) => b.code === targetBranch) || {}).label || targetBranch;
    const { confirmed } = await confirmDialog({
      title: `Reset ${bLabel} to the Group default?`,
      message: `This clears ${bLabel}’s configurable-rule overrides so it inherits the Group default for every rule again. Reversible — set overrides again any time.`,
      danger: false,
      confirmLabel: 'Reset to inherit',
    });
    if (!confirmed) return;
    await applyBulk(resetBranchChanges(targetBranch), `${bLabel} → Group default (inherit)`);
  };

  // Impact preview — read-only "what would this rule have caught?" against the last 90 days
  // of vouchers for the current branch scope. Caches per flag; re-runs on click.
  const onPreview = async (key) => {
    setPreviewing(key);
    try {
      const r = await flagImpact(key, branch, 90);
      setImpacts((m) => ({ ...m, [key]: (r && r.impact) || r || {} }));
    } catch (e) {
      setImpacts((m) => ({ ...m, [key]: { error: (e && e.message) || 'Preview failed' } }));
    } finally {
      setPreviewing('');
    }
  };
  // One-line summary of a preview result for inline display. A measurable-but-zero result
  // carrying a note (no ceiling / no locks configured) shows the note, not a bare "0".
  const impactText = (imp) => {
    if (!imp) return '';
    if (imp.error) return imp.error;
    if (imp.measurable === false) return imp.note;
    if (imp.count === 0 && imp.note) return imp.note;
    const amt = Number(imp.amount || 0).toLocaleString('en-IN');
    const scopeLabel = imp.branch ? ` · ${(LIMIT_BRANCHES.find((b) => b.code === imp.branch) || {}).label || imp.branch}` : '';
    const eg = imp.examples && imp.examples.length ? ` (e.g. ${imp.examples.slice(0, 3).join(', ')})` : '';
    return `Last ${imp.days}d${scopeLabel}: ${imp.count} voucher${imp.count === 1 ? '' : 's'} · ₹${amt}${eg}`;
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
            const imp = impacts[c.flag];
            return (
              <div key={c.flag}>
                <SwitchRow {...c} on={isOn(c.flag)} onPropose={onPropose} />
                {warn && isOn(c.flag) && <div className="mt-1 flex items-start gap-1.5 rounded-md border border-warning/40 bg-warning-soft px-2.5 py-1.5 text-[11px] text-warning"><span>⚠</span><span>{warn}</span></div>}
                <div className="mt-1 flex flex-wrap items-center gap-2 pl-0.5">
                  <button type="button" onClick={() => onPreview(c.flag)} disabled={previewing === c.flag}
                    className="text-[10.5px] font-medium text-navy/70 hover:text-navy hover:underline disabled:opacity-60">
                    {previewing === c.flag ? 'Checking…' : '🔍 Preview impact'}
                  </button>
                  {imp && <span className={`text-[10.5px] ${imp.error ? 'text-danger' : 'text-ink-muted'}`}>{impactText(imp)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const screenBody = () => {
    switch (screen) {
      case 'law-erp':
        return (
          <>
            <p className="mb-1.5 mt-1 max-w-[82ch] text-[13.5px] text-ink-muted">
              The <b>accounting law floor</b> — <b>{band.totals.accounts}</b> locked laws across <b>{band.accounts.length}</b> domains
              (tax, ledgers, posting, gross profit, refunds, reconciliation). These are <b>always on and read-only</b>: they apply on
              day one and can’t be switched off. Click a domain for its individual rules in the{' '}
              <button type="button" className="font-semibold text-navy underline" onClick={() => go('/tk/rules?tab=book&track=accounts')}>Rule Book</button>.
              The process &amp; control laws are under{' '}
              <button type="button" className="font-semibold text-navy underline" onClick={() => setScreen('law-ops')}>Operational Rules</button>.
            </p>
            <LawState q={lawQ} />
            <div className="grid gap-4">
              <LawGroup title={'📒 Accounts — financial law'} sub="Accounts" rows={band.accounts} count={band.totals.accounts} onOpen={() => go('/tk/rules?tab=book&track=accounts')} />
            </div>
            <H3>Day-one foundation locks</H3>
            <p className="mb-3 -mt-1 max-w-[82ch] text-[12.5px] text-ink-muted">The always-on essentials spelled out in plain language — the most governance-critical laws, across both tracks.</p>
            <div className="grid gap-2.5 tablet:grid-cols-2">{DEFAULT_RULES.map((r, i) => <DefaultRow key={i} {...r} />)}</div>
          </>
        );
      case 'law-ops':
        return (
          <>
            <p className="mb-1.5 mt-1 max-w-[82ch] text-[13.5px] text-ink-muted">
              The <b>process &amp; control law floor</b> — <b>{band.totals.ops}</b> locked laws across <b>{band.ops.length}</b> domains
              (approvals, voucher lifecycle, inter-branch, access, visibility, HR). Also <b>always on and read-only</b>. Click a domain
              for its individual rules in the{' '}
              <button type="button" className="font-semibold text-navy underline" onClick={() => go('/tk/rules?tab=book&track=ops')}>Rule Book</button>.
              The intended role posture and the master-onboarding chain are the other two screens in this head.
            </p>
            <LawState q={lawQ} />
            <div className="grid gap-4">
              <LawGroup title={'⚙ Operations — process & control law'} sub="Operations" rows={band.ops} count={band.totals.ops} onOpen={() => go('/tk/rules?tab=book&track=ops')} />
            </div>
          </>
        );
      case 'configurable':
        return (
          <>
            <p className="mb-4 mt-1 max-w-[80ch] text-[13.5px] text-ink-muted">The rules you switch on one-by-one{scoped ? <> for <b>{branchLabel}</b></> : ''}. Each is independent — there is no master switch. {owner ? 'Flip any switch to apply it live.' : 'Changes are submitted for the Owner’s approval.'}</p>
            {owner && (
              <div className="mb-4 grid gap-2 rounded-brand border border-surface-border bg-surface-alt px-3 py-2.5">
                {/* Bulk — go-live / rollback in one action */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-1 w-[52px] shrink-0 font-mono text-[9.5px] font-semibold uppercase tracking-wide text-ink-subtle">Bulk</span>
                  <button type="button" onClick={() => onBulk(true)} disabled={vo} title={vo ? VIEW_ONLY_REASON : undefined} className={`rounded-full border border-success/50 bg-success-soft px-3 py-1 text-[11.5px] font-semibold text-success hover:bg-success/10 ${vo ? 'cursor-not-allowed opacity-50' : ''}`}>Enable all</button>
                  <button type="button" onClick={() => onBulk(false)} disabled={vo} title={vo ? VIEW_ONLY_REASON : undefined} className={`rounded-full border border-surface-border bg-surface px-3 py-1 text-[11.5px] font-semibold text-ink-muted hover:bg-danger-soft hover:text-danger ${vo ? 'cursor-not-allowed opacity-50' : ''}`}>Disable all</button>
                  {scoped && <button type="button" onClick={() => onResetBranch(branch)} disabled={vo} title={vo ? VIEW_ONLY_REASON : undefined} className={`rounded-full border border-surface-border bg-surface px-3 py-1 text-[11.5px] font-semibold text-ink-muted hover:bg-navy/5 hover:text-navy ${vo ? 'cursor-not-allowed opacity-50' : ''}`}>↺ Reset to inherit</button>}
                  <span className="ml-1 text-[11px] text-ink-muted">all {CONFIGURABLE_FLAGS.length} rules{scoped ? ` · ${branchLabel}` : ' · Group default'}</span>
                </div>
                {/* Presets — named posture bundles */}
                <div className="flex flex-wrap items-center gap-2 border-t border-surface-border/60 pt-2">
                  <span className="mr-1 w-[52px] shrink-0 font-mono text-[9.5px] font-semibold uppercase tracking-wide text-ink-subtle">Presets</span>
                  {POSTURE_PRESETS.map((p) => (
                    <button key={p.key} type="button" onClick={() => onApplyPreset(p)} disabled={vo} title={vo ? VIEW_ONLY_REASON : p.desc}
                      className={`rounded-full border border-navy/30 bg-navy/5 px-3 py-1 text-[11.5px] font-semibold text-navy hover:bg-navy/10 ${vo ? 'cursor-not-allowed opacity-50' : ''}`}>{p.label}</button>
                  ))}
                  <span className="ml-1 text-[11px] text-ink-muted">a known-good bundle (sets the rest off).</span>
                </div>
                {/* Copy across branches */}
                <div className="flex flex-wrap items-center gap-2 border-t border-surface-border/60 pt-2">
                  <span className="mr-1 w-[52px] shrink-0 font-mono text-[9.5px] font-semibold uppercase tracking-wide text-ink-subtle">Copy</span>
                  <select value={copySource} onChange={(e) => setCopySource(e.target.value)} aria-label="Copy source branch"
                    className="rounded-md border border-surface-border bg-surface px-2 py-1 text-[11.5px] text-ink">
                    {LIMIT_BRANCHES.filter((b) => b.code !== 'default').map((b) => <option key={b.code} value={b.code}>{b.label}</option>)}
                  </select>
                  <button type="button" onClick={onCopyConfig} disabled={vo} title={vo ? VIEW_ONLY_REASON : undefined}
                    className={`rounded-full border border-surface-border bg-surface px-3 py-1 text-[11.5px] font-semibold text-ink-muted hover:bg-navy/5 hover:text-navy ${vo ? 'cursor-not-allowed opacity-50' : ''}`}>Copy to all other branches</button>
                  <span className="ml-1 text-[11px] text-ink-muted">apply this branch’s setup everywhere else.</span>
                </div>
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
      case 'grid': {
        const codes = LIMIT_BRANCHES.map((b) => b.code);
        const grid = postureGrid(flagsQ.data, codes);
        const branchOf = (code) => (LIMIT_BRANCHES.find((b) => b.code === code) || {}).label || code;
        return (
          <>
            <p className="mb-3 mt-1 max-w-[84ch] text-[13.5px] text-ink-muted">Every configurable rule across all branches at a glance. <b>✓</b> on · <b>·</b> off; a <b>solid</b> cell is an explicit branch override, a <b>faded</b> cell inherits the Group default. Click any cell to flip it{owner ? ' live.' : ' — it is submitted for the Owner’s approval.'}</p>
            <div className="overflow-x-auto rounded-brand border border-surface-border bg-surface">
              <table className="w-full min-w-[760px] text-[12px]">
                <thead>
                  <tr className="bg-surface-alt text-ink-muted">
                    <th className="sticky left-0 z-10 bg-surface-alt p-2.5 text-left font-mono text-[9px] font-semibold uppercase tracking-wide">Rule</th>
                    {LIMIT_BRANCHES.map((b) => (
                      <th key={b.code} className="p-2 text-center font-mono text-[9px] font-semibold uppercase tracking-wide">
                        <div>{b.label}</div>
                        {owner && b.code !== 'default' && (
                          <button type="button" onClick={() => onResetBranch(b.code)} disabled={vo} title={vo ? VIEW_ONLY_REASON : `Reset ${b.label} to the Group default`}
                            className={`mt-0.5 font-sans text-[9px] font-normal normal-case text-ink-subtle hover:text-navy hover:underline ${vo ? 'cursor-not-allowed opacity-50' : ''}`}>↺ inherit</button>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grid.map((g) => (
                    <React.Fragment key={g.group}>
                      <tr><td colSpan={LIMIT_BRANCHES.length + 1} className="border-t border-surface-border/60 bg-surface-alt/50 px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-ink-subtle">{g.group}</td></tr>
                      {g.rows.map((row) => (
                        <tr key={row.key} className="border-t border-surface-border/60 hover:bg-navy/[0.03]">
                          <td className="sticky left-0 z-10 bg-surface p-2.5 font-semibold text-ink">{row.nm}</td>
                          {codes.map((code) => {
                            const c = row.cells[code] || { on: false, override: false };
                            return (
                              <td key={code} className="p-1.5 text-center">
                                <div className="flex justify-center">
                                  <GridCell cell={c} crit={row.crit} onClick={() => flipFor(row.key, code)}
                                    label={`${row.nm} · ${branchOf(code)} · ${c.on ? 'on' : 'off'}${code === 'default' ? ' (group default)' : (c.override ? ' (override)' : ' (inherits)')}`} />
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-ink-muted">
              <span className="flex items-center gap-1.5"><span className="flex h-5 w-5 items-center justify-center rounded bg-success text-[11px] font-bold text-white">✓</span> on · override</span>
              <span className="flex items-center gap-1.5"><span className="flex h-5 w-5 items-center justify-center rounded bg-success-soft text-[11px] font-bold text-success">✓</span> on · inherits default</span>
              <span className="flex items-center gap-1.5"><span className="flex h-5 w-5 items-center justify-center rounded bg-danger text-[11px] font-bold text-white">✓</span> on · money control</span>
              <span className="flex items-center gap-1.5"><span className="flex h-5 w-5 items-center justify-center rounded bg-surface-alt text-[11px] font-bold text-ink-muted ring-1 ring-inset ring-surface-border">·</span> off · override</span>
              <span className="flex items-center gap-1.5"><span className="flex h-5 w-5 items-center justify-center rounded bg-surface text-[11px] font-bold text-ink-subtle">·</span> off · inherits default</span>
              <span className="text-ink-subtle">↺ inherit = clear a branch’s overrides</span>
            </div>
          </>
        );
      }
      case 'matrix': return <EnforcementMatrix go={go} branch={branch} />;
      case 'tester': return <PolicyTester branch={branch} />;
      case 'active': return <ActiveControls />;
      case 'digest': return <DailyDigest go={go} />;
      case 'limits': return <BranchLimitsEditor go={go} branch={branch} onBranchChange={setBranch} />;
      case 'users': return <UserConfig go={go} branch={branch} />;
      case 'authority': return <AuthorityAdmin canManage={owner} />;
      case 'rates': return <RatesReference />;
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
  // A failed / blocked flag read returns {flags:{}, _error} (see api/flags getFlagState). Surface
  // it as its OWN state — "Everything OFF · dormant" must never stand in for "couldn't load".
  const loadError = flagsQ.data && flagsQ.data._error;
  const loading = flagsQ.isLoading;

  return (
    <div data-testid="tk-control-panel">
      {/* status strip — the REAL configurable-flag state for the scope, OR a distinct load /
          error state so a failed/blocked read never masquerades as a genuinely dormant system. */}
      {loadError ? (
        <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 rounded-brand border border-danger/40 bg-danger-soft px-4 py-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-danger">Control Panel</span>
          <Badge tone="danger">Couldn’t load</Badge>
          <span className="text-[12px] text-danger">
            <b>Control state didn’t load</b> — a <b>load error, not a dormant system</b>; the panel can’t show what’s enforced. Source: <code>/api/tk/flags</code>{owner ? '' : ' (central roles only)'}.
          </span>
          <button type="button" onClick={() => qc.invalidateQueries({ queryKey: ['tk', 'flags'] })}
            className="ml-auto shrink-0 rounded-full border border-danger/40 bg-surface px-2.5 py-1 text-[11px] font-semibold text-danger hover:bg-danger-soft">↻ Retry</button>
        </div>
      ) : loading ? (
        <div role="status" aria-busy="true" className="mb-4 flex flex-wrap items-center gap-3 rounded-brand border border-surface-border bg-surface-alt px-4 py-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-subtle">Control Panel</span>
          <span className="rounded-full bg-surface px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink-muted">Loading…</span>
          <span className="text-[12px] text-ink-muted">Reading the live control state…</span>
        </div>
      ) : (
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
          <button type="button" onClick={() => go('/tk/rules?tab=book')}
            className="ml-auto shrink-0 rounded-full border border-surface-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink-muted hover:bg-navy/5 hover:text-navy">
            📖 Rule Book
          </button>
        </div>
      )}

      {/* branch scope selector — every control below applies to the chosen branch */}
      {showBranchBar && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-brand border border-surface-border bg-surface-alt px-3 py-2">
          <span className="mr-1 font-mono text-[9.5px] font-semibold uppercase tracking-wide text-ink-subtle">Applies to</span>
          {LIMIT_BRANCHES.map((b) => {
            const active = branch === b.code;
            return (
              <button key={b.code} type="button" aria-pressed={active} onClick={() => { setBranch(b.code); setImpacts({}); }}
                className={`rounded-full border px-3 py-1 text-[11.5px] transition-colors ${active ? 'border-navy bg-navy text-white font-semibold' : 'border-surface-border text-ink-muted hover:bg-navy/5'}`}>
                {b.label}{b.code !== 'default' && <span className={`ml-1 font-mono text-[9px] ${active ? 'text-white/70' : 'text-ink-subtle'}`}>{b.ccy}</span>}
              </button>
            );
          })}
          {scoped && <span className="ml-1 text-[11px] text-ink-muted">— overrides fall back to <b>Group default</b> where unset.</span>}
        </div>
      )}

      {msg && (
        <div role="status" className={`mb-3 rounded-brand px-3 py-2 text-xs ${
          msgTone === 'success' ? 'bg-success-soft text-success'
            : msgTone === 'error' ? 'bg-danger-soft text-danger'
            : msgTone === 'warning' ? 'bg-warning-soft text-warning'
            : 'bg-navy/5 text-navy'}`}>{msg}</div>
      )}
      <div className="grid gap-4 desktop:grid-cols-[230px_1fr]">
        {/* nav */}
        <nav className="rounded-brand border border-surface-border bg-surface p-2" aria-label="Control Panel screens">
          {POWER_SCREENS.map((grp) => (
            <div key={grp.group} className="mb-2">
              <div className="px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-ink-subtle">{grp.group}</div>
              {grp.items.map((it) => {
                const keys = SCREEN_FLAGS[it.key];
                // Count in the SAME scope the status strip reports (stripBranch: the selected
                // branch on branch-scoped screens, else the Group default) so the badge and strip
                // never disagree on a screen with no visible branch selector. Suppressed on a
                // load error so a nav badge never reads "off" while the strip says it couldn't load.
                const onN = (keys && !loadError) ? keys.filter((k) => isFlagOn(flagsQ.data, k, stripBranch)).length : null;
                return (
                  <button key={it.key} onClick={() => setScreen(it.key)} aria-current={screen === it.key ? 'page' : undefined}
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
