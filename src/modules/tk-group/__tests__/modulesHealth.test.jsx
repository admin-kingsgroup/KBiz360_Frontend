import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { headScore, gradeOf, scoreTone, headCards, overallHealth, howTo100 } from '../utils/modulesHealth';

// ── Pure scorecard maths ──────────────────────────────────────────────────────

describe('Modules Health · scorecard maths (pure)', () => {
  test('headScore averages METERED rows only — sys/eng machinery never drags a score', () => {
    expect(headScore([{ pct: 100 }, { pct: 50 }, { pct: null }])).toBe(75);
    expect(headScore([{ pct: null }, { pct: null }])).toBeNull();
    expect(headScore([])).toBeNull();
  });

  test('grades and tones band correctly', () => {
    expect(gradeOf(95)).toBe('A');
    expect(gradeOf(80)).toBe('B');
    expect(gradeOf(65)).toBe('C');
    expect(gradeOf(45)).toBe('D');
    expect(gradeOf(10)).toBe('E');
    expect(gradeOf(null)).toBe('—');
    expect(scoreTone(80)).toBe('success');
    expect(scoreTone(60)).toBe('warning');
    expect(scoreTone(20)).toBe('danger');
    expect(scoreTone(null)).toBe('neutral');
  });

  test('headCards + overallHealth roll the readiness tree into scored cards', () => {
    const d = { tree: [
      { head: 'Accounting & Ledgers', modules: [
        { id: 'accounting', name: 'Core Accounting', kind: 'op', units: [{ branch: 'BOM', scope: 'branch', status: 'live', pct: 100, missing: [] }], config: [], link: '/journal', owners: [] },
        { id: 'fiscal-years', name: 'Fiscal Years', kind: 'sys', units: [], config: [], link: '', owners: [] },
      ] },
      { head: 'HR / Payroll', modules: [
        { id: 'employees', name: 'Employee Master', kind: 'op', units: [{ branch: 'BOM', scope: 'branch', status: 'dormant', pct: 0, missing: ['Employees entered'] }], config: [], link: '/hr/employees', owners: [] },
      ] },
    ] };
    const cards = headCards(d, 'ALL', {});
    expect(cards).toHaveLength(2);
    expect(cards[0]).toMatchObject({ head: 'Accounting & Ledgers', score: 100, grade: 'A', metered: 1, total: 2 });
    expect(cards[1]).toMatchObject({ head: 'HR / Payroll', score: 0, grade: 'E' });
    expect(cards[1].tally.dormant).toBe(1);
    const all = overallHealth(cards);
    expect(all).toMatchObject({ score: 50, modules: 3, live: 1, dormant: 1 });
    expect(overallHealth([])).toMatchObject({ score: 0, grade: '—', modules: 0 });
  });

  test('howTo100 gives readable, ordered steps to full health — each routed to where it is done', () => {
    // Live → nothing to do
    expect(howTo100({ health: 'live' })[0].text).toContain('Already at 100%');
    // Partial with named gaps + lagging branches + config + dev
    const steps = howTo100({
      health: 'partial', pct: 50, link: '/masters/customers',
      missing: [{ label: 'Credit limits set', branches: ['AMD', 'NBO'], link: '/masters/customers' }],
      config: [{ label: 'GSP / IRP e-Invoice', note: 'No GST Suvidha Provider connected yet.', link: '/settings/gsp-irp' }],
      devItems: [{ status: 'stub', name: 'E-Invoice integration', remark: 'Build the IRN store.' },
                 { status: 'dormant', name: 'By-design sleeper' }],   // dormant excluded
    });
    expect(steps).toEqual([
      { text: 'Complete "Credit limits set" — still missing in AMD, NBO.', link: '/masters/customers' },
      { text: 'Set up: GSP / IRP e-Invoice — No GST Suvidha Provider connected yet.', link: '/settings/gsp-irp' },
      { text: 'Development: E-Invoice integration — Build the IRN store. (clear it in Dev Control).', link: '/dev/control' },
    ]);
    // Milestone without its own link falls back to the module's screen
    expect(howTo100({ health: 'dormant', pct: 0, link: '/hr/employees', missing: [{ label: 'Employees entered', branches: [] }], config: [], devItems: [] })[0])
      .toEqual({ text: 'Complete "Employees entered".', link: '/hr/employees' });
    // System machinery honestly says there is nothing to score
    expect(howTo100({ health: null, pct: null, kind: 'sys', missing: [], config: [], devItems: [] })[0].text).toContain('System machinery');
    // Dormant with no listed milestones → generic data-entry step, still routed
    expect(howTo100({ health: 'dormant', pct: 0, link: '/x', missing: [], config: [], devItems: [] })[0]).toMatchObject({ link: '/x' });
  });
});

// ── Render smoke: the merged home — cards on top, per-module health + tasks below ──

const READINESS = { tree: [
  { head: 'Accounting & Ledgers', modules: [
    { id: 'accounting', name: 'Core Accounting', kind: 'op', units: [{ branch: 'BOM', scope: 'branch', status: 'live', pct: 100, missing: [] }], config: [], link: '/journal', owners: [] },
    { id: 'ledgers', name: 'Chart of Accounts / Ledgers', kind: 'op', units: [{ branch: 'BOM', scope: 'branch', status: 'partial', pct: 50, missing: ['Openings certified'] }], config: [], link: '/masters/ledgers', owners: [] },
  ] },
  { head: 'HR / Payroll', modules: [
    { id: 'employees', name: 'Employee Master', kind: 'op', units: [{ branch: 'BOM', scope: 'branch', status: 'dormant', pct: 0, missing: ['Employees entered'] }], config: [], link: '/hr/employees', owners: [] },
  ] },
], byBranch: [{ branch: 'BOM' }, { branch: 'NBO' }, { branch: 'Central' }] };

const TASKS = {
  branches: ['BOM', 'NBO'],
  tasks: [
    { id: 'ledgers-openings', module: 'ledgers', branch: 'BOM', assignee: 'FM', label: 'Certify opening balances', section: 'Chart & Codes', link: '/masters/ledgers', check: 'openings = 0', remark: 'Certify.', status: 'pending' },
  ],
  parties: {
    customers: { total: 1, incomplete: 1, capped: false, items: [{ name: 'NeuIQ Technologies Private Limited', branch: 'BOM', missing: ['Credit limit'] }] },
    suppliers: { total: 0, incomplete: 0, capped: false, items: [] },
    employees: { total: 0, incomplete: 0, capped: false, items: [] },
  },
  coverage: { total: 75, modules: [
    { id: 'ledgers', name: 'Chart of Accounts / Ledgers', head: 'Accounting & Ledgers', kind: 'op', via: 'task' },
  ] },
};

jest.mock('../../../core/api', () => ({ isViewOnly: () => false, VIEW_ONLY_REASON: 'View only — this account can review but cannot make changes.', apiGet: jest.fn(() => Promise.resolve({})), apiPost: jest.fn(() => Promise.resolve({})), getAuthToken: jest.fn(() => 'open') }));
jest.mock('../api/monitor', () => ({
  getSetupReadiness: jest.fn().mockResolvedValue(READINESS),
  getSetupTasks: jest.fn().mockResolvedValue(TASKS),
  getDevFindings: jest.fn().mockResolvedValue([]),
}));
// eslint-disable-next-line import/first
import { ModulesHealth } from '../ModulesHealth';
// eslint-disable-next-line import/first
import { MemoryRouter } from 'react-router-dom';

function renderWith(setRoute) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}><ModulesHealth setRoute={setRoute} /></QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('ModulesHealth render (merged home — wiring smoke)', () => {
  test('cards score the head; clicking a card expands ONLY that section with health + tasks', async () => {
    const setRoute = jest.fn();
    renderWith(setRoute);
    const card = await screen.findByTestId('tk-mh-card-Accounting & Ledgers');
    expect(card.textContent).toContain('75%');            // (100 + 50) / 2
    expect(card.textContent).toContain('1 live');
    expect(card.textContent).toContain('1 partial');
    expect(card.textContent).toContain('to configure');   // the pending-tasks hook
    // Sections are COLLAPSED by default — header present, body NOT rendered (short page)
    expect(screen.getByTestId('tk-mh-section-accounting-ledgers')).toBeInTheDocument();
    expect(screen.queryByTestId('tk-mh-body-accounting-ledgers')).not.toBeInTheDocument();
    // Click the card → its section expands (focused) and the body renders
    fireEvent.click(card);
    const sec = screen.getByTestId('tk-mh-section-accounting-ledgers');
    expect(sec.className).toContain('border-accent');
    const body = within(sec).getByTestId('tk-mh-body-accounting-ledgers');
    expect(body.textContent).toContain('Core Accounting');
    expect(body.textContent).toContain('Chart of Accounts / Ledgers');
    expect(body.textContent).toContain('1/1 branches live');
    expect(body.textContent).toContain('To reach 100%');
    expect(body.textContent).toContain('Complete "Openings certified"');   // health step
    expect(body.textContent).toContain('Certify opening balances');        // punch-list task
    // Deep-links from within the expanded body
    fireEvent.click(within(body).getByText('Complete →'));                 // the task
    expect(setRoute).toHaveBeenCalledWith('/masters/ledgers');
    fireEvent.click(within(body).getAllByText('Do it →')[0]);             // ledgers health step
    expect(setRoute).toHaveBeenCalledWith('/masters/ledgers');
    fireEvent.click(within(body).getAllByText('Open →')[0]);              // accounting sub-module
    expect(setRoute).toHaveBeenCalledWith('/journal');
    // Clicking the section header again collapses it
    fireEvent.click(screen.getByTestId('tk-mh-sechead-accounting-ledgers'));
    expect(screen.queryByTestId('tk-mh-body-accounting-ledgers')).not.toBeInTheDocument();
  });

  test('KPIs, user worklist filter, branch bar, and party completeness all render', async () => {
    renderWith();
    await screen.findByTestId('tk-mh-card-Accounting & Ledgers'); // data loaded
    const kpis = screen.getByTestId('tk-mh-kpis');
    expect(kpis.textContent).toContain('Overall health');
    expect(kpis.textContent).toContain('1/3');            // sub-modules live
    expect(kpis.textContent).toContain('Tasks to configure');
    // User worklist filter (folded in from the retired Task List)
    expect(screen.getByTestId('tk-mh-user-FM').textContent).toContain('FM · Faiz');
    expect(screen.getByTestId('tk-mh-user-Owner').textContent).toContain('Owner · Afshin');
    // Branch bar from byBranch, Central excluded
    const bar = screen.getByTestId('tk-mh-branchbar');
    expect(screen.getByTestId('tk-mh-branch-BOM')).toBeInTheDocument();
    expect(screen.getByTestId('tk-mh-branch-NBO')).toBeInTheDocument();
    expect(bar.textContent).not.toContain('Central');
    // Party master completeness (foot) renders under All / FM
    expect(screen.getByText('NeuIQ Technologies Private Limited')).toBeInTheDocument();
    // Coverage proof renders
    expect(screen.getByText(/Module scan coverage/)).toBeInTheDocument();
  });
});
