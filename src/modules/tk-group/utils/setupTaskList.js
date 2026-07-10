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
        module: (i.modules && i.modules[0]) || null,
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

/** Per-branch pending counts within the current user scope — the branch pills.
 *  Counts open tasks AND incomplete master details, so a branch pill shows its
 *  full workload (opening balances are NOT tracked — full history was imported). */
export function branchCounts(tasks, branches = [], user = 'ALL', d = null) {
  const counts = { ALL: 0, Central: 0 };
  branches.forEach((b) => { counts[b] = 0; });
  (tasks || []).forEach((t) => {
    if (t.status === 'done' || (user !== 'ALL' && t.assignee !== user)) return;
    counts.ALL += 1;
    if (counts[t.branch] != null) counts[t.branch] += 1;
  });
  if (d && (user === 'ALL' || user === 'FM')) {
    const p = d.parties || {};
    ['customers', 'suppliers', 'employees'].forEach((m) => {
      (((p[m] || {}).items) || []).forEach((i) => {
        counts.ALL += 1;
        const b = String(i.branch || '').trim();
        const key = b === '' || b === 'ALL' ? 'Central' : b;
        if (counts[key] != null) counts[key] += 1;
      });
    });
  }
  return counts;
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
  return { customers: shape(p.customers), suppliers: shape(p.suppliers), employees: shape(p.employees) };
}

/** KPI tiles for the current scope. Progress is scoped too — a branch's tile
 *  reads that branch's completion, not the group's. */
export function taskKpis(d, tasks, branch = 'ALL', user = 'ALL') {
  const { pending, done } = taskRows(tasks, branch, user);
  const parties = partyRows(d, branch);
  const details = parties.customers.items.length + parties.suppliers.items.length + parties.employees.items.length;
  const total = pending.length + done.length;
  const pct = total ? Math.round((100 * done.length) / total) : 0;
  return [
    { key: 'pending', label: 'Tasks to configure', value: String(pending.length) },
    { key: 'done', label: 'Configured (auto-verified)', value: String(done.length) },
    { key: 'details', label: 'Master details to fill', value: String(details) },
    { key: 'progress', label: 'Progress', value: `${pct}%` },
  ];
}

/** Group the scoped tasks module-wise → sub-module-wise, for the "By module"
 *  view. Works for every user scope (All / FM / Developer / Owner): the same
 *  branch+user filters apply first, then tasks nest under head module →
 *  sub-module (names/heads come from the payload's coverage table). Tasks with
 *  no module id land under "Other configuration". */
export function moduleGroups(tasks, coverageModules = [], branch = 'ALL', user = 'ALL') {
  const info = {};
  (coverageModules || []).forEach((m) => { info[m.id] = m; });
  const scoped = (tasks || []).filter(
    (t) => inBranchScope(t, branch) && (user === 'ALL' || t.assignee === user),
  );
  const byModule = new Map();
  scoped.forEach((t) => {
    const id = t.module && info[t.module] ? t.module : '__other';
    if (!byModule.has(id)) byModule.set(id, []);
    byModule.get(id).push(t);
  });
  const heads = new Map();
  byModule.forEach((list, id) => {
    const meta = info[id] || { head: 'Other configuration', name: 'Unmapped tasks', id: '__other' };
    if (!heads.has(meta.head)) heads.set(meta.head, []);
    heads.get(meta.head).push({
      id: meta.id,
      name: meta.name,
      pending: list.filter((t) => t.status !== 'done').map((r, i) => ({ ...r, sr: i + 1 })),
      done: list.filter((t) => t.status === 'done').map((r, i) => ({ ...r, sr: i + 1 })),
    });
  });
  // Preserve the canonical tree order for heads and sub-modules.
  const headOrder = [...new Set((coverageModules || []).map((m) => m.head))];
  const moduleOrder = (coverageModules || []).map((m) => m.id);
  return [...heads.entries()]
    .sort((a, b) => {
      const ia = headOrder.indexOf(a[0]); const ib = headOrder.indexOf(b[0]);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    })
    .map(([head, modules]) => ({
      head,
      modules: modules.sort((a, b) => {
        const ia = moduleOrder.indexOf(a.id); const ib = moduleOrder.indexOf(b.id);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      }),
      pending: modules.reduce((s, m) => s + m.pending.length, 0),
      done: modules.reduce((s, m) => s + m.done.length, 0),
    }));
}
