// ─── TK GROUP · FE · go-live checklist shaping (pure) ────────────────────────
// There is no master switch — enforcement goes live rule-by-rule. "Engaged" = any
// configurable (non-foundation) control is on for the group; the always-on foundation
// rules apply from day one regardless. Turns the live flag state + pending flag-change
// count into the go-live steps and their done/not status.

/** Is any CONFIGURABLE control engaged (globally or for some branch)? Foundation (always-on)
 *  flags don't count toward go-live — they enforce from day one. */
export function enforcementEngaged(flagState) {
  const flags = (flagState && flagState.flags) || {};
  return Object.values(flags).some((f) => f && f.foundation !== true
    && (f.enabled === true || (f.branches && Object.values(f.branches).some((v) => v === true))));
}

export function goLiveStatus(flagState) {
  return enforcementEngaged(flagState) ? 'live' : 'dormant';
}

/** The ordered go-live steps with live done/hint state. */
export function goLiveSteps(flagState, pendingFlagCount = 0) {
  const flags = (flagState && flagState.flags) || {};
  const on = enforcementEngaged(flagState);
  const proposed = pendingFlagCount > 0;
  return [
    {
      key: 'catalog', label: 'Control catalogue available', done: Object.keys(flags).length > 0,
      hint: 'The control rules are registered and visible in the Control Panel.',
    },
    {
      key: 'foundation', label: 'Foundation rules enforcing', done: true,
      hint: 'The always-on default rules apply from day one — nothing to switch.',
    },
    {
      key: 'engage', label: 'Configurable rules engaged', done: on || proposed, href: '/tk/control-panel',
      hint: on ? 'At least one control is engaged.' : (proposed ? `${pendingFlagCount} rule change awaiting the Owner.` : 'Switch on the rules you want in the Control Panel → Configurable Rules.'),
    },
    {
      key: 'live', label: 'Enforcement live', done: on,
      hint: on ? 'Enforcement is active — controls are enforcing.' : 'Completes as soon as any configurable rule is engaged.',
    },
  ];
}
