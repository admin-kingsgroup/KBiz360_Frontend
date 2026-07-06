// ─── TK GROUP · FE · go-live checklist shaping (pure) ────────────────────────
// Turns the live flag state + pending flag-change count into the go-live steps and
// their done/not status, so the checklist shows exactly where you are.

/** Is the master guard (core.policy_guard) engaged? Foundation counts as on. */
export function masterIsOn(flagState) {
  const f = ((flagState && flagState.flags) || {})['core.policy_guard'] || {};
  return f.foundation === true || f.enabled === true;
}

export function goLiveStatus(flagState) {
  return masterIsOn(flagState) ? 'live' : 'dormant';
}

/** The ordered go-live steps with live done/hint state. */
export function goLiveSteps(flagState, pendingFlagCount = 0) {
  const flags = (flagState && flagState.flags) || {};
  const on = masterIsOn(flagState);
  const proposed = pendingFlagCount > 0;
  return [
    {
      key: 'catalog', label: 'Control catalogue available', done: Object.keys(flags).length > 0,
      hint: 'The control flags are registered and visible on Control Flags.',
    },
    {
      key: 'propose', label: 'Master control proposed', done: on || proposed, href: '/tk/controls',
      hint: on ? 'Already engaged.' : (proposed ? 'A flag change is in the approval queue.' : 'Toggle "Master control" on Control Flags to file the request.'),
    },
    {
      key: 'approve', label: 'Owner approved', done: on, href: '/tk/approvals',
      hint: on ? 'Approved and applied.' : (proposed ? `${pendingFlagCount} flag change awaiting the Owner.` : 'The Owner approves it in the Approvals Inbox.'),
    },
    {
      key: 'live', label: 'Guard engaged — go-live complete', done: on,
      hint: on ? 'core.policy_guard is ON — enforcement is active.' : 'Completes automatically on the second approval.',
    },
  ];
}
