import {
  statusTone, statusLabel, severityTone, ownerTone, readinessKpis, readinessRows, categoryRows, branchRows,
  scopeUnits, rollupUnits, moduleHealthLabel, moduleHealthTone, moduleNeed, needLabel, moduleRemark, moduleMapRows,
} from '../utils/setupReadiness';
import { openDevByModule, ALL_ITEMS } from '../../devControl/registry';

describe('TK setup readiness · FE shaping (pure)', () => {
  test('statusTone maps to Badge tones', () => {
    expect(statusTone('dormant')).toBe('danger');
    expect(statusTone('partial')).toBe('warning');
    expect(statusTone('other')).toBe('info');
  });

  test('statusLabel is human-readable', () => {
    expect(statusLabel('dormant')).toBe('Not started');
    expect(statusLabel('partial')).toBe('In progress');
    expect(statusLabel('awaiting')).toBe('Awaiting setup');
  });

  test('severityTone maps to Badge tones', () => {
    expect(severityTone('error')).toBe('danger');
    expect(severityTone('warn')).toBe('warning');
    expect(severityTone('info')).toBe('info');
  });

  test('readinessKpis: pending / error / warn / branches from summary (ALL)', () => {
    const d = { summary: { modulesPending: 12, error: 5, warn: 4, info: 3, branchesAffected: 6 } };
    const k = readinessKpis(d);
    expect(k[0]).toMatchObject({ key: 'pending', value: '12' });
    expect(k[1]).toMatchObject({ key: 'error', value: '5' });
    expect(k[2]).toMatchObject({ key: 'warn', value: '4' });
    expect(k[3]).toMatchObject({ key: 'branches', value: '6' });
    expect(k).toHaveLength(4);
  });

  test('readinessKpis(d, branch): tiles read the branch slice, not the group total', () => {
    // The bug this guards: a branch-filtered table under group KPIs. Focus BOM → tiles = BOM.
    const d = {
      summary: { modulesPending: 182, error: 164, warn: 13, branchesAffected: 6 },
      byBranch: [{ branch: 'BOM', pending: 26, error: 23, warn: 3, info: 0, live: 5, total: 31 }],
    };
    const k = readinessKpis(d, 'BOM');
    expect(k[0]).toMatchObject({ key: 'pending', value: '26' }); // NOT 182
    expect(k[1]).toMatchObject({ key: 'error', value: '23' });   // NOT 164
    expect(k[2]).toMatchObject({ key: 'warn', value: '3' });
    expect(k[3]).toMatchObject({ key: 'branches', value: '5/31' }); // modules live for BOM
    expect(readinessKpis(d, 'ALL')[0]).toMatchObject({ value: '182' }); // ALL still group
  });

  test('ownerTone maps teams to Badge tones', () => {
    expect(ownerTone('Accounts')).toBe('info');
    expect(ownerTone('Operations')).toBe('warning');
    expect(ownerTone('IT & Admin')).toBe('neutral');
    expect(ownerTone('HR')).toBe('neutral');
    expect(ownerTone(undefined)).toBe('neutral');
  });

  test('readinessRows / categoryRows / branchRows pass through payload arrays', () => {
    const d = {
      issues: [{ key: 'hr-attendance' }],
      byCategory: [{ category: 'HR', error: 2 }],
      byBranch: [{ branch: 'BOM', pending: 3, live: 5, total: 31 }],
    };
    expect(readinessRows(d)).toHaveLength(1);
    expect(categoryRows(d)[0].category).toBe('HR');
    expect(branchRows(d)[0]).toMatchObject({ branch: 'BOM', pending: 3, live: 5, total: 31 });
  });

  test('fail-soft on empty payload', () => {
    expect(readinessKpis({})[0]).toMatchObject({ value: '0' });
    expect(readinessRows(undefined)).toEqual([]);
    expect(categoryRows({})).toEqual([]);
    expect(branchRows(undefined)).toEqual([]);
  });
});

describe('TK setup readiness · module map (pure)', () => {
  const units = [
    { branch: 'BOM', scope: 'branch', status: 'live', pct: 100, missing: [] },
    { branch: 'AMD', scope: 'branch', status: 'partial', pct: 50, missing: ['Credit limits set'] },
    { branch: 'Central', scope: 'central', status: 'dormant', pct: 0, missing: ['Series defined'] },
  ];

  test('scopeUnits: ALL keeps everything; a branch keeps its units + Central', () => {
    expect(scopeUnits(units, 'ALL')).toHaveLength(3);
    const bom = scopeUnits(units, 'BOM');
    expect(bom.map((u) => u.branch)).toEqual(['BOM', 'Central']); // central config always applies
  });

  test('rollupUnits: aggregated health + branch-tagged missing list', () => {
    const agg = rollupUnits(units);
    expect(agg).toMatchObject({ health: 'partial', liveUnits: 1, totalUnits: 3, pct: 50 });
    expect(agg.missing).toEqual([
      { label: 'Credit limits set', branches: ['AMD'], link: '' },
      { label: 'Series defined', branches: ['Central'], link: '' },
    ]);
    expect(rollupUnits([])).toMatchObject({ health: null, totalUnits: 0 }); // no meter ≠ green
    expect(rollupUnits(units.map((u) => ({ ...u, status: 'dormant' }))).health).toBe('dormant');
  });

  test('rollupUnits: per-milestone entry links ride the units’ actions', () => {
    const withActions = [
      { branch: 'BOM', scope: 'branch', status: 'partial', pct: 50, missing: ['Expense budgets set'], actions: [{ label: 'Expense budgets set', link: '/expense/budget' }] },
      { branch: 'AMD', scope: 'branch', status: 'partial', pct: 50, missing: ['Expense budgets set'], actions: [{ label: 'Expense budgets set', link: '/expense/budget' }] },
    ];
    expect(rollupUnits(withActions).missing).toEqual([
      { label: 'Expense budgets set', branches: ['BOM', 'AMD'], link: '/expense/budget' },
    ]);
  });

  test('moduleHealthLabel: kind-aware when there is no live meter', () => {
    expect(moduleHealthLabel('live')).toBe('Live');
    expect(moduleHealthLabel('dormant')).toBe('Not started');
    expect(moduleHealthLabel(null, 'sys')).toBe('System');
    expect(moduleHealthLabel(null, 'eng')).toBe('Tower engine');
    expect(moduleHealthTone('live')).toBe('success');
    expect(moduleHealthTone(null)).toBe('neutral');
  });

  test('moduleNeed: config vs development vs both; dormant dev items are not a need', () => {
    expect(moduleNeed({ health: 'dormant', config: [] }, [])).toBe('config');
    expect(moduleNeed({ health: 'live', config: [] }, [{ status: 'stub' }])).toBe('dev');
    expect(moduleNeed({ health: 'partial', config: [] }, [{ status: 'pending' }])).toBe('both');
    expect(moduleNeed({ health: 'live', config: [] }, [{ status: 'dormant' }])).toBe('none'); // by design
    expect(moduleNeed({ health: 'live', config: [{ key: 'x' }] }, [])).toBe('config'); // awaiting-setup config
    expect(needLabel('both')).toBe('Config + Development');
  });

  test('moduleRemark: narrates gaps, awaiting-setup and dev findings in plain words', () => {
    const row = {
      health: 'partial', totalUnits: 2,
      missing: [{ label: 'Credit limits set', branches: ['AMD'] }],
      config: [{ key: 'gsp-irp', label: 'GSP / IRP e-Invoice', note: 'No GST Suvidha Provider connected yet.' }],
    };
    const remark = moduleRemark(row, [{ status: 'stub', name: 'E-Invoice integration' }]);
    expect(remark).toContain('Credit limits set (AMD)');
    expect(remark).toContain('Awaiting setup: GSP / IRP e-Invoice');
    expect(remark).toContain('Dev: E-Invoice integration');
    expect(moduleRemark({ health: 'live', missing: [], config: [] }, [])).toContain('All milestones met');
  });

  test('moduleMapRows: joins tree + branch scope + dev findings into render rows', () => {
    const d = { tree: [{ head: 'Masters & Parties', modules: [
      { id: 'customers', name: 'Customers', kind: 'op', units, config: [], link: '/masters/customers', owners: ['Accounts'] },
      { id: 'sub-agents', name: 'Sub-Agents', kind: 'op', units: [], config: [], link: '', owners: [] },
    ] }] };
    const heads = moduleMapRows(d, 'BOM', { customers: [{ id: 'x', status: 'stub', name: 'Stub thing' }] });
    const [h] = heads;
    const customers = h.rows.find((r) => r.id === 'customers');
    // BOM live + Central dormant → partial in BOM focus; stub dev item → both
    expect(customers.health).toBe('partial');
    expect(customers.need).toBe('both');
    const sub = h.rows.find((r) => r.id === 'sub-agents');
    expect(sub.health).toBeNull();
    expect(sub.need).toBe('none');
    expect(h.summary.dev).toBe(1);
    expect(moduleMapRows(undefined, 'ALL', {})).toEqual([]); // fail-soft
  });

  test('openDevByModule: every dev item maps by module id; cleared items drop off', () => {
    const by = openDevByModule({});
    // Registry-agnostic spot-checks (item statuses change as dev work lands):
    // every OPEN (dev-pending) item with modules appears under each of its module
    // ids; LIVE and DORMANT items never appear (live = cleared; dormant = a
    // go-live switch, not dev work).
    const isOpen = (i) => i.status !== 'live' && i.status !== 'dormant';
    ALL_ITEMS.filter((i) => isOpen(i) && (i.modules || []).length).forEach((i) => {
      i.modules.forEach((m) => expect((by[m] || []).map((x) => x.id)).toContain(i.id));
    });
    ALL_ITEMS.filter((i) => !isOpen(i) && (i.modules || []).length).forEach((i) => {
      i.modules.forEach((m) => expect((by[m] || []).map((x) => x.id)).not.toContain(i.id));
    });
    // marking an item done clears it from the map (same rule as Dev Control)
    const item = ALL_ITEMS.find((i) => isOpen(i) && (i.modules || []).length);
    if (item) {
      const cleared = openDevByModule({ [item.id]: { status: 'done' } });
      expect((cleared[item.modules[0]] || []).map((i) => i.id)).not.toContain(item.id);
    }
  });

  test('registry hygiene: every item declares modules[], ids match the backend tree', () => {
    ALL_ITEMS.forEach((i) => expect(Array.isArray(i.modules)).toBe(true));
    // Guard against typo'd module ids drifting from the backend 75-module tree.
    const KNOWN = new Set(['accounting', 'ledgers', 'vouchers', 'voucher-types', 'groups', 'cost-centers', 'cost-categories',
      'numbering-series', 'fiscal-years', 'booking-orders', 'bookings', 'inter-branch-voucher', 'purchases', 'sales-targets',
      'salespeople', 'customers', 'suppliers', 'company-profile', 'hsn-codes', 'document-types', 'sub-agents',
      'credit-facilities', 'vendor-advances', 'tour-codes', 'projects', 'forex-rates', 'fixed-assets', 'asset-categories',
      'loans', 'investments', 'pdc-register', 'expense-ledgers', 'budgets', 'expense-budgets', 'cashflow-forecast',
      'scenarios', 'interbranch-reconciliation', 'bank-reconciliation', 'recon-status', 'client-reconciliation',
      'supplier-reconciliation', 'tally-reconciliation', 'reconciliation-shared', 'tax-reconciliation', 'gstr2b',
      'tax-calendar', 'adm-memos', 'adm-reason-codes', 'hr', 'employees', 'attendance', 'crm', 'collections',
      'support-tickets', 'tickets', 'approval-rules', 'tk-group', 'approval-limits', 'alerts', 'alert-states', 'audit',
      'digest', 'export-audit', 'email-templates', 'app-config', 'auth', 'roles', 'user-access', 'books-access',
      'field-access', 'custom-fields', 'branches', 'notifications', 'user-prefs', 'import']);
    ALL_ITEMS.forEach((i) => (i.modules || []).forEach((id) => {
      expect(KNOWN.has(id) ? id : `${i.name} → unknown module '${id}'`).toBe(id);
    }));
  });
});
