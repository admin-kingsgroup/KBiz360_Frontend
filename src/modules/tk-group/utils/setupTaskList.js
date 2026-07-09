import { STATUS_META, isCleared } from '../../devControl/registry';

// ─── TK GROUP · FE · Task List shaping (pure — unit-tested without React) ─────
// The Control Tower Task List: PURELY CONFIGURATION, auto-generated live by the
// ERP on every refresh. Two sources merge here:
//  • Config tasks from GET /api/tk/monitor/setup-tasks — every module/sub-module
//    whose configuration makes the system run live, statuses already resolved by
//    live DB checks (never transaction counts). All under FM (+ Owner activations).
//  • Development issues from the developer registry + Dev Control tracking — ALL
//    open findings, each with its registry remark, under Developer. Same clearing
//    rule as Dev Control: mark Done there (or flip the row live) and it moves here.

export const TASK_USERS = ['FM', 'Developer', 'Owner'];

export function assigneeLabel(a) {
  if (a === 'FM') return 'FM · Faiz';
  if (a === 'Owner') return 'Owner · Afshin';
  if (a === 'Developer') return 'Developer';
  return a || '—';
}

export function assigneeTone(a) {
  if (a === 'FM') return 'info';
  if (a === 'Owner') return 'warning';
  return 'neutral';
}

export function taskStatusTone(s) {
  if (s === 'done') return 'success';
  return 'warning';
}

export function taskStatusLabel(s) {
  if (s === 'done') return 'Configured';
  return 'Pending';
}

/** Map the developer registry onto Task List rows — ALL development issues under
 *  Developer, each with its proper remark. Registry rows already live are not
 *  issues and stay off the list; an open item closed via Dev Control tracking
 *  (done / won't-do) MOVES to Configured rather than vanishing. */
export function devFindingRows(items = [], trackMap = {}) {
  return items
    .filter((i) => i.status !== 'live')
    .map((i) => {
      const tracked = trackMap[i.id];
      const meta = STATUS_META[i.status] || {};
      const trackedNote = tracked && tracked.status && tracked.status !== 'open' ? ` · ${tracked.status}` : '';
      return {
        id: `dev:${i.id}`,
        branch: 'Central',
        assignee: 'Developer',
        label: i.name,
        section: i.area,
        link: '/dev/control',
        check: `dev registry = ${meta.label || i.status}${trackedNote}`,
        remark: i.remark || i.note || '—',
        status: isCleared(i, tracked) ? 'done' : 'pending',
      };
    });
}

/** Merge config tasks (backend) + development issues (registry) into one list. */
export function combineTasks(d, devRows = []) {
  return [...((d && d.tasks) || []), ...devRows];
}

/** Does a task fall inside the selected branch scope? 'ALL' sees everything;
 *  'Central' sees only central config; a branch sees ITS tasks only — branchwise
 *  details never mix. */
export function inBranchScope(task, branch) {
  if (!branch || branch === 'ALL') return true;
  return task.branch === branch;
}

/** Filter + split + serial-number the merged tasks for the branch and user. */
export function taskRows(tasks, branch = 'ALL', user = 'ALL') {
  const all = (tasks || []).filter(
    (t) => inBranchScope(t, branch) && (user === 'ALL' || t.assignee === user),
  );
  const number = (rows) => rows.map((r, i) => ({ ...r, sr: i + 1 }));
  return {
    pending: number(all.filter((t) => t.status !== 'done')),
    done: number(all.filter((t) => t.status === 'done')),
  };
}

/** Per-user pending counts within the current branch scope — the user pills. */
export function userCounts(tasks, branch = 'ALL') {
  const counts = { ALL: 0 };
  TASK_USERS.forEach((u) => { counts[u] = 0; });
  (tasks || []).forEach((t) => {
    if (!inBranchScope(t, branch) || t.status === 'done') return;
    counts.ALL += 1;
    if (counts[t.assignee] != null) counts[t.assignee] += 1;
  });
  return counts;
}

/** Per-branch pending counts within the current user scope — the branch pills. */
export function branchCounts(tasks, branches = [], user = 'ALL') {
  const counts = { ALL: 0, Central: 0 };
  branches.forEach((b) => { counts[b] = 0; });
  (tasks || []).forEach((t) => {
    if (t.status === 'done' || (user !== 'ALL' && t.assignee !== user)) return;
    counts.ALL += 1;
    if (counts[t.branch] != null) counts[t.branch] += 1;
  });
  return counts;
}

/** Ledger opening meter scoped to the branch selection. */
export function ledgerScope(d, branch = 'ALL') {
  const byBranch = ((d && d.ledgers) || {}).byBranch || [];
  if (branch === 'Central') return { mode: 'central', pending: 0, byBranch };
  if (!branch || branch === 'ALL') {
    return { mode: 'all', pending: byBranch.reduce((s, b) => s + (b.pending || 0), 0), byBranch };
  }
  const row = byBranch.find((b) => b.branch === branch) || { branch, pending: 0, total: 0, entered: 0 };
  return { mode: 'branch', pending: row.pending || 0, row, byBranch };
}

/** Party-master incomplete records, branch-scoped so details never mix: a record
 *  with no branch (or branch 'ALL') is central; a branch shows only its own. */
function inPartyScope(item, branch) {
  if (!branch || branch === 'ALL') return true;
  const b = String(item.branch || '').trim();
  if (branch === 'Central') return b === '' || b === 'ALL';
  return b === branch;
}

export function partyRows(d, branch = 'ALL') {
  const p = (d && d.parties) || {};
  const shape = (m) => {
    const items = ((m || {}).items || []).filter((i) => inPartyScope(i, branch)).map((r, i) => ({ ...r, sr: i + 1 }));
    return { total: (m || {}).total || 0, incomplete: (m || {}).incomplete || 0, capped: !!(m || {}).capped, items };
  };
  return { customers: shape(p.customers), suppliers: shape(p.suppliers) };
}

/** KPI tiles for the current scope. Progress is scoped too — a branch's tile
 *  reads that branch's completion, not the group's. */
export function taskKpis(d, tasks, branch = 'ALL', user = 'ALL') {
  const { pending, done } = taskRows(tasks, branch, user);
  const lg = ledgerScope(d, branch);
  const parties = partyRows(d, branch);
  const details = parties.customers.items.length + parties.suppliers.items.length;
  const total = pending.length + done.length;
  const pct = total ? Math.round((100 * done.length) / total) : 0;
  return [
    { key: 'pending', label: 'Tasks to configure', value: String(pending.length) },
    { key: 'done', label: 'Configured (auto-verified)', value: String(done.length) },
    { key: 'ledgers', label: 'Ledgers awaiting opening', value: String(lg.pending) },
    { key: 'details', label: 'Master details to fill', value: String(details) },
    { key: 'progress', label: 'Progress', value: `${pct}%` },
  ];
}

/** The pending-ledger rows for the drill-in table (branch scope only). */
export function ledgerRows(d) {
  return (((d && d.ledgers) || {}).items || []).map((l, i) => ({ ...l, sr: i + 1 }));
}
