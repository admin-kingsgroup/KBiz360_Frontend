import {
  TASK_USERS, assigneeLabel, assigneeTone, taskStatusTone, taskStatusLabel,
  devFindingRows, combineTasks, inBranchScope, taskRows, userCounts, branchCounts,
  partyRows, taskKpis, moduleGroups,
} from '../utils/setupTaskList';
import { ALL_ITEMS, isCleared } from '../../devControl/registry';

// Pure shaping for the Control Tower Task List — config statuses arrive resolved
// from the backend's live DB checks; development issues come from the dev
// registry. The FE only merges, scopes, splits and numbers.

const BRANCHES = ['BOM', 'MHUB', 'AMD', 'NBO', 'DAR', 'FBM'];
const D = {
  branches: BRANCHES,
  tasks: [
    { id: 'credit-facilities', branch: 'Central', assignee: 'FM', status: 'pending', link: '/masters/credit-facilities' },
    { id: 'opening-balances-BOM', branch: 'BOM', assignee: 'FM', status: 'pending', link: '/masters/ledgers' },
    { id: 'opening-balances-AMD', branch: 'AMD', assignee: 'FM', status: 'pending', link: '/masters/ledgers' },
    { id: 'voucher-types', branch: 'Central', assignee: 'FM', status: 'done', link: '/masters/voucher-types' },
    { id: 'rule-CUS-01', branch: 'Central', assignee: 'Owner', status: 'pending', link: '/tk/rules' },
    { id: 'core-rules', branch: 'Central', assignee: 'Owner', status: 'done', link: '/tk/rules' },
  ],
  parties: {
    customers: { total: 5, incomplete: 2, capped: false, items: [
      { name: 'NeuIQ Technologies', branch: 'BOM', missing: ['Credit limit', 'GST treatment'] },
      { name: 'Sea Hook Engineering', branch: 'AMD', missing: ['Contact (phone/email)'] },
    ] },
    suppliers: { total: 91, incomplete: 1, capped: false, items: [
      { name: 'TRIP JACK', branch: 'ALL', missing: ['GSTIN'] },
    ] },
    employees: { total: 7, incomplete: 2, capped: false, items: [
      { name: 'Half Entered', branch: 'BOM', missing: ['Designation', 'Basic salary'] },
      { name: 'New Joiner', branch: 'NBO', missing: ['Shift assigned'] },
    ] },
  },
};

describe('TK task list · labels and tones', () => {
  test('assignee labels name the actual people', () => {
    expect(assigneeLabel('FM')).toBe('FM · Faiz');
    expect(assigneeLabel('Owner')).toBe('Owner · Afshin');
    expect(assigneeLabel('Developer')).toBe('Developer');
    expect(TASK_USERS).toEqual(['FM', 'Developer', 'Owner']);
  });

  test('status tones/labels: pending=warning, done=success', () => {
    expect(taskStatusTone('pending')).toBe('warning');
    expect(taskStatusTone('done')).toBe('success');
    expect(taskStatusLabel('done')).toBe('Configured');
    expect(taskStatusLabel('pending')).toBe('Pending');
    expect(assigneeTone('FM')).toBe('info');
  });
});

describe('TK task list · development issues from the registry (pure)', () => {
  test('ALL non-live registry findings land under Developer with their remark', () => {
    const rows = devFindingRows(ALL_ITEMS, {});
    const openCount = ALL_ITEMS.filter((i) => i.status !== 'live' && !isCleared(i, undefined)).length;
    expect(rows.filter((r) => r.status === 'pending')).toHaveLength(openCount);
    rows.forEach((r) => {
      expect(r.assignee).toBe('Developer');
      expect(r.branch).toBe('Central');
      expect(r.id).toMatch(/^dev:/);
      expect(r.remark).toBeTruthy();      // proper remark, always
      expect(r.link).toBe('/dev/control');
      expect(r.check).toContain('dev registry = ');
    });
  });

  test('live registry rows are not issues; a tracked done item MOVES to Configured', () => {
    const items = [
      { id: 'a', name: 'A', area: 'X', status: 'live', note: 'n' },
      { id: 'b', name: 'B', area: 'X', status: 'stub', remark: 'fix b' },
      { id: 'c', name: 'C', area: 'X', status: 'pending', note: 'build c' },
    ];
    const rows = devFindingRows(items, { b: { status: 'done' } });
    expect(rows.map((r) => r.id)).toEqual(['dev:b', 'dev:c']); // 'a' never appears
    expect(rows.find((r) => r.id === 'dev:b').status).toBe('done'); // moved, not vanished
    expect(rows.find((r) => r.id === 'dev:b').check).toContain('· done');
    expect(rows.find((r) => r.id === 'dev:c')).toMatchObject({ status: 'pending', remark: 'build c' });
  });

  test('combineTasks merges backend config tasks with dev rows', () => {
    const merged = combineTasks(D, [{ id: 'dev:x', branch: 'Central', assignee: 'Developer', status: 'pending' }]);
    expect(merged).toHaveLength(D.tasks.length + 1);
    expect(combineTasks(undefined, [])).toEqual([]);
  });
});

describe('TK task list · branchwise scoping never mixes (pure)', () => {
  const tasks = combineTasks(D, [{ id: 'dev:x', branch: 'Central', assignee: 'Developer', status: 'pending' }]);

  test('inBranchScope: ALL sees everything; a branch sees only its rows; Central only central', () => {
    expect(inBranchScope({ branch: 'Central' }, 'ALL')).toBe(true);
    expect(inBranchScope({ branch: 'BOM' }, 'BOM')).toBe(true);
    expect(inBranchScope({ branch: 'Central' }, 'BOM')).toBe(false);
    expect(inBranchScope({ branch: 'BOM' }, 'Central')).toBe(false);
    expect(inBranchScope({ branch: 'AMD' }, 'BOM')).toBe(false); // branches never see each other
  });

  test('taskRows: splits pending vs done and serial-numbers each; scopes compose', () => {
    const all = taskRows(tasks, 'ALL', 'ALL');
    expect(all.pending.map((r) => r.sr)).toEqual([1, 2, 3, 4, 5]);
    expect(all.done.map((r) => r.id)).toEqual(['voucher-types', 'core-rules']);
    expect(taskRows(tasks, 'BOM', 'ALL').pending.map((r) => r.id)).toEqual(['opening-balances-BOM']);
    expect(taskRows(tasks, 'Central', 'Owner').pending.map((r) => r.id)).toEqual(['rule-CUS-01']);
    expect(taskRows(tasks, 'Central', 'Developer').pending.map((r) => r.id)).toEqual(['dev:x']);
  });

  test('userCounts / branchCounts: pending-only pills that follow the other scope', () => {
    expect(userCounts(tasks, 'ALL')).toMatchObject({ ALL: 5, FM: 3, Developer: 1, Owner: 1 });
    expect(userCounts(tasks, 'BOM')).toMatchObject({ ALL: 1, FM: 1, Developer: 0 });
    expect(branchCounts(tasks, BRANCHES, 'ALL')).toMatchObject({ ALL: 5, Central: 3, BOM: 1, AMD: 1, NBO: 0 });
    expect(branchCounts(tasks, BRANCHES, 'Owner')).toMatchObject({ ALL: 1, Central: 1, BOM: 0 });
    // With the payload, pills also count incomplete master details (FM scope only)
    const withDetails = branchCounts(tasks, BRANCHES, 'ALL', D);
    expect(withDetails.BOM).toBe(1 + 2);      // 1 task + BOM customer + BOM employee
    expect(withDetails.Central).toBe(3 + 1);  // 3 central tasks + branch-'ALL' supplier
    expect(branchCounts(tasks, BRANCHES, 'Owner', D).BOM).toBe(0); // details are FM work, not Owner's
  });

  test('moduleGroups: nests scoped tasks head → sub-module in tree order, for every user scope', () => {
    const coverage = [
      { id: 'accounting', name: 'Core Accounting', head: 'Accounting & Ledgers' },
      { id: 'credit-facilities', name: 'Credit Facilities', head: 'Masters & Parties' },
      { id: 'tk-group', name: 'TK Group Central', head: 'Governance & Control Tower' },
    ];
    const tasks = [
      { id: 'credit-facilities', module: 'credit-facilities', branch: 'Central', assignee: 'FM', status: 'pending' },
      { id: 'mod:core-acct:BOM', module: 'accounting', branch: 'BOM', assignee: 'FM', status: 'done' },
      { id: 'rule-CUS-01', module: 'tk-group', branch: 'Central', assignee: 'Owner', status: 'pending' },
      { id: 'dev:x', module: null, branch: 'Central', assignee: 'Developer', status: 'pending' }, // unmapped
    ];
    const all = moduleGroups(tasks, coverage, 'ALL', 'ALL');
    // Tree order preserved: Accounting head first, then Masters, then Governance, then Other
    expect(all.map((h) => h.head)).toEqual(['Accounting & Ledgers', 'Masters & Parties', 'Governance & Control Tower', 'Other configuration']);
    expect(all[0].modules[0]).toMatchObject({ id: 'accounting', name: 'Core Accounting' });
    expect(all[0].done).toBe(1);
    expect(all[1].pending).toBe(1);
    // User scope composes: Owner sees only the governance group
    const owner = moduleGroups(tasks, coverage, 'ALL', 'Owner');
    expect(owner.map((h) => h.head)).toEqual(['Governance & Control Tower']);
    expect(owner[0].modules[0].pending[0].id).toBe('rule-CUS-01');
    // Branch scope composes: BOM sees only its scan row
    const bom = moduleGroups(tasks, coverage, 'BOM', 'ALL');
    expect(bom).toHaveLength(1);
    expect(bom[0].modules[0].done[0].id).toBe('mod:core-acct:BOM');
    // Fail-soft
    expect(moduleGroups(undefined, undefined)).toEqual([]);
  });

  test('CONSERVATION: By-module view never loses or duplicates a task — group totals equal the flat view, for every scope', () => {
    const coverage = [
      { id: 'accounting', name: 'Core Accounting', head: 'Accounting & Ledgers' },
      { id: 'credit-facilities', name: 'Credit Facilities', head: 'Masters & Parties' },
      { id: 'tk-group', name: 'TK Group Central', head: 'Governance & Control Tower' },
    ];
    // Real-shaped mixed bag: mapped, unmapped, dev, scan, done, per-branch
    const bag = combineTasks(D, devFindingRows(ALL_ITEMS, {}));
    [['ALL', 'ALL'], ['BOM', 'ALL'], ['Central', 'Owner'], ['ALL', 'Developer'], ['NBO', 'FM']].forEach(([b, u]) => {
      const flat = taskRows(bag, b, u);
      const groups = moduleGroups(bag, coverage, b, u);
      const gPending = groups.reduce((s, h) => s + h.pending, 0);
      const gDone = groups.reduce((s, h) => s + h.done, 0);
      expect(`${b}/${u}: ${gPending}+${gDone}`).toBe(`${b}/${u}: ${flat.pending.length}+${flat.done.length}`);
    });
  });

  test('partyRows: branch scope keeps details separate — BOM never shows AMD customers or NBO staff', () => {
    expect(partyRows(D, 'ALL').customers.items).toHaveLength(2);
    expect(partyRows(D, 'ALL').employees.items).toHaveLength(2);
    const bom = partyRows(D, 'BOM');
    expect(bom.customers.items.map((i) => i.name)).toEqual(['NeuIQ Technologies']);
    expect(bom.suppliers.items).toEqual([]); // branch 'ALL' supplier is central, not BOM's
    expect(bom.employees.items.map((i) => i.name)).toEqual(['Half Entered']); // NBO joiner never mixes in
    const central = partyRows(D, 'Central');
    expect(central.suppliers.items.map((i) => i.name)).toEqual(['TRIP JACK']);
    expect(central.customers.items).toEqual([]);
    expect(partyRows(D, 'AMD').customers.items[0]).toMatchObject({ name: 'Sea Hook Engineering', sr: 1 });
  });
});

describe('TK task list · ledgers + KPIs (pure)', () => {
  test('taskKpis: five scoped tiles — a branch tile never shows the group total', () => {
    const tasks = D.tasks;
    const all = taskKpis(D, tasks, 'ALL', 'ALL');
    expect(all.map((k) => k.key)).toEqual(['pending', 'done', 'details', 'progress']);
    expect(all[0].value).toBe('4');
    expect(all[2].value).toBe('5'); // 2 customers + 1 supplier + 2 employees
    expect(all[3].value).toBe('33%'); // 2 of 6
    const bom = taskKpis(D, tasks, 'BOM', 'ALL');
    expect(bom[0].value).toBe('1');
    expect(bom[2].value).toBe('2'); // BOM's incomplete customer + employee
  });

  test('fail-soft on empty payload — never a false all-configured', () => {
    expect(taskRows(undefined).pending).toEqual([]);
    expect(userCounts([])).toMatchObject({ ALL: 0 });
    expect(branchCounts(undefined, BRANCHES)).toMatchObject({ ALL: 0, Central: 0 });
    expect(partyRows({}, 'ALL').customers.items).toEqual([]);
    expect(partyRows({}, 'ALL').employees.items).toEqual([]);
    expect(taskKpis({}, [], 'ALL', 'ALL')[3].value).toBe('0%');
    expect(devFindingRows(undefined, undefined)).toEqual([]);
  });
});
