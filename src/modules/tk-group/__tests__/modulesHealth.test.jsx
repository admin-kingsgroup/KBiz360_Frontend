import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

// ── Render smoke: cards → click → sub-module drill ────────────────────────────

const READINESS = { tree: [
  { head: 'Accounting & Ledgers', modules: [
    { id: 'accounting', name: 'Core Accounting', kind: 'op', units: [{ branch: 'BOM', scope: 'branch', status: 'live', pct: 100, missing: [] }], config: [], link: '/journal', owners: [] },
    { id: 'ledgers', name: 'Chart of Accounts / Ledgers', kind: 'op', units: [{ branch: 'BOM', scope: 'branch', status: 'partial', pct: 50, missing: ['Openings certified'] }], config: [], link: '/masters/ledgers', owners: [] },
  ] },
  { head: 'HR / Payroll', modules: [
    { id: 'employees', name: 'Employee Master', kind: 'op', units: [{ branch: 'BOM', scope: 'branch', status: 'dormant', pct: 0, missing: ['Employees entered'] }], config: [], link: '/hr/employees', owners: [] },
  ] },
], byBranch: [{ branch: 'BOM' }, { branch: 'NBO' }, { branch: 'Central' }] };

jest.mock('../api/monitor', () => ({
  getSetupReadiness: jest.fn().mockResolvedValue(READINESS),
  getDevFindings: jest.fn().mockResolvedValue([]),
}));
// eslint-disable-next-line import/first
import { ModulesHealth } from '../ModulesHealth';

function renderWith(setRoute) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><ModulesHealth setRoute={setRoute} /></QueryClientProvider>);
}

describe('ModulesHealth render (wiring smoke)', () => {
  test('head cards show score + tally; clicking a card drills into each sub-module health', async () => {
    const setRoute = jest.fn();
    renderWith(setRoute);
    const card = await screen.findByTestId('tk-mh-card-Accounting & Ledgers');
    expect(card.textContent).toContain('75%');            // (100 + 50) / 2
    expect(card.textContent).toContain('1 live');
    expect(card.textContent).toContain('1 partial');
    expect(screen.queryByTestId('tk-mh-drill')).not.toBeInTheDocument();
    // Click → sub-module health opens
    fireEvent.click(card);
    const drill = screen.getByTestId('tk-mh-drill');
    expect(drill.textContent).toContain('Core Accounting');
    expect(drill.textContent).toContain('Live');
    expect(drill.textContent).toContain('Chart of Accounts / Ledgers');
    expect(drill.textContent).toContain('Partly set up');
    expect(drill.textContent).toContain('1/1 branches live');
    // Readable path-to-100% renders per sub-module, with routed steps
    expect(drill.textContent).toContain('To reach 100%');
    expect(drill.textContent).toContain('Complete "Openings certified"');
    expect(drill.textContent).toContain('Already at 100%'); // the live module's status line
    fireEvent.click(screen.getAllByText('Do it →')[0]);
    expect(setRoute).toHaveBeenCalledWith('/masters/ledgers');
    // Open → deep-links to the sub-module's screen
    fireEvent.click(screen.getAllByText('Open →')[0]);
    expect(setRoute).toHaveBeenCalledWith('/journal');
    // Click again → collapses
    fireEvent.click(card);
    expect(screen.queryByTestId('tk-mh-drill')).not.toBeInTheDocument();
  });

  test('KPIs roll up all heads; branch bar renders from byBranch (Central excluded)', async () => {
    renderWith();
    await screen.findByTestId('tk-mh-card-Accounting & Ledgers'); // data loaded
    const kpis = screen.getByTestId('tk-mh-kpis');
    expect(kpis.textContent).toContain('Overall health');
    expect(kpis.textContent).toContain('1/3');            // sub-modules live
    const bar = screen.getByTestId('tk-mh-branchbar');
    expect(screen.getByTestId('tk-mh-branch-BOM')).toBeInTheDocument();
    expect(screen.getByTestId('tk-mh-branch-NBO')).toBeInTheDocument();
    expect(bar.textContent).not.toContain('Central');
  });
});
