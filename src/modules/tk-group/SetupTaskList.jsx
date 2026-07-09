import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSetupTasks, getDevFindings } from './api/monitor';
import {
  TASK_USERS, assigneeLabel, assigneeTone, taskStatusTone, taskStatusLabel,
  devFindingRows, combineTasks, taskRows, userCounts, branchCounts,
  ledgerScope, partyRows, taskKpis, ledgerRows,
} from './utils/setupTaskList';
import { PageSection, ResponsiveGrid, Badge } from '../../shell/primitives';
import { KpiTile } from '../dashboard/components/cards/KpiTile';
import { DataTable } from '../../shell/DataTable';
import { BandError } from './BandError';
import { useCockpitFocus } from '../../store/cockpitFocus';
// Development issues come from the developer registry + Dev Control tracking —
// the SAME source and clearing rule as the Development tab (shared react-query
// key ['dev-control','status']). Fixing an item in /dev/control moves it here.
import { ALL_ITEMS as DEV_ITEMS } from '../devControl/registry';

// ─── TK GROUP · FE · Task List (Control Tower, after Governance) ──────────────
// PURELY CONFIGURATION — the live auto-generated punch-list of everything that
// must be CONFIGURED for the system to run live, deep-scanned across all modules
// and sub-modules on every refresh. Entries/vouchers are never counted: a module
// is not "not started" for having no transactions, and a party master task is
// about its DETAILS being complete, not whether it has entries. All configuration
// sits under FM, all development issues (from the dev registry, with their
// remarks) under Developer, the two activations under Owner. Branchwise details
// never mix — scope rides the TK Group sub-selector like Setup Readiness.

const LEDGER_REMARK = 'Enter Opening Balance + Dr/Cr from the 19-06-2026 cut-off TB. Leave only if genuinely zero, then certify in Reconciliation.';

function taskColumns(setRoute, withActions) {
  const go = (link) => (setRoute ? setRoute(link) : (window.location.href = link));
  const cols = [
    { key: 'sr', header: 'SR', align: 'right', render: (r) => (
      <span className="tabular-nums text-[12px] font-semibold text-ink-subtle">{r.sr}</span>
    ) },
    { key: 'branch', header: 'Branch', render: (r) => (
      <Badge tone={r.branch === 'Central' ? 'neutral' : 'info'} size="sm">{r.branch}</Badge>
    ) },
    { key: 'assignee', header: 'User', render: (r) => (
      <Badge tone={assigneeTone(r.assignee)} size="sm">{assigneeLabel(r.assignee)}</Badge>
    ) },
    { key: 'label', header: 'Module / Configuration', render: (r) => (
      <div>
        <div className="font-medium text-ink">{r.label}</div>
        <div className="text-[11px] text-ink-subtle">{r.section}</div>
      </div>
    ) },
    { key: 'check', header: 'Live check', render: (r) => (
      <span className="whitespace-nowrap font-mono text-[11px] text-ink-muted">{r.check}</span>
    ) },
    { key: 'remark', header: 'Remark', render: (r) => (
      <span className="text-[11px] text-ink-muted">{r.remark}</span>
    ) },
    { key: 'status', header: 'Status', align: 'center', render: (r) => (
      <Badge tone={taskStatusTone(r.status)} size="sm">{taskStatusLabel(r.status)}</Badge>
    ) },
  ];
  if (withActions) {
    cols.push({ key: 'go', header: '', align: 'right', render: (r) => (r.link
      ? <button type="button" onClick={() => go(r.link)} className="whitespace-nowrap text-[12px] font-semibold text-accent hover:underline">Complete →</button>
      : null) });
  }
  return cols;
}

function ledgerColumns(setRoute) {
  const go = () => (setRoute ? setRoute('/masters/ledgers') : (window.location.href = '/masters/ledgers'));
  return [
    { key: 'sr', header: 'SR', align: 'right', render: (r) => (
      <span className="tabular-nums text-[12px] font-semibold text-ink-subtle">{r.sr}</span>
    ) },
    { key: 'code', header: 'Code', render: (r) => (
      <span className="whitespace-nowrap font-mono text-[11.5px] text-ink">{r.code || '—'}</span>
    ) },
    { key: 'name', header: 'Ledger', render: (r) => <span className="font-medium text-ink">{r.name}</span> },
    { key: 'group', header: 'Group / Sub-group', render: (r) => (
      <span className="text-[11.5px] text-ink-muted">{r.group}{r.subGroup ? ` · ${r.subGroup}` : ''}</span>
    ) },
    { key: 'remark', header: 'Remark', render: () => (
      <span className="text-[11px] text-ink-muted">{LEDGER_REMARK}</span>
    ) },
    { key: 'status', header: 'Status', align: 'center', render: () => (
      <Badge tone="warning" size="sm">No opening set</Badge>
    ) },
    { key: 'go', header: '', align: 'right', render: () => (
      <button type="button" onClick={go} className="whitespace-nowrap text-[12px] font-semibold text-accent hover:underline">Complete →</button>
    ) },
  ];
}

function partyColumns(setRoute, link) {
  const go = () => (setRoute ? setRoute(link) : (window.location.href = link));
  return [
    { key: 'sr', header: 'SR', align: 'right', render: (r) => (
      <span className="tabular-nums text-[12px] font-semibold text-ink-subtle">{r.sr}</span>
    ) },
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-ink">{r.name}</span> },
    { key: 'branch', header: 'Branch', render: (r) => (
      <Badge tone={r.branch ? 'info' : 'neutral'} size="sm">{r.branch || 'ALL'}</Badge>
    ) },
    { key: 'missing', header: 'Details to fill', render: (r) => (
      <span className="text-[11.5px] text-ink">{(r.missing || []).join(' · ')}</span>
    ) },
    { key: 'status', header: 'Status', align: 'center', render: () => (
      <Badge tone="warning" size="sm">Incomplete</Badge>
    ) },
    { key: 'go', header: '', align: 'right', render: () => (
      <button type="button" onClick={go} className="whitespace-nowrap text-[12px] font-semibold text-accent hover:underline">Complete →</button>
    ) },
  ];
}

function ScopePill({ on, onClick, children, testId }) {
  return (
    <button type="button" onClick={onClick} data-testid={testId}
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${on ? 'border-accent bg-accent text-white' : 'border-surface-border bg-surface text-ink-muted hover:border-accent hover:text-accent'}`}>
      {children}
    </button>
  );
}

export function SetupTaskList({ setRoute } = {}) {
  // Branch scope: follows the top TK Group Central selector (cockpit Focus) and
  // re-syncs when it changes; within ALL the in-tab bar drills into one branch —
  // the same contract as Setup Readiness. User scope is local to the tab.
  const focus = useCockpitFocus();
  const [branch, setBranch] = useState(focus || 'ALL');
  const [user, setUser] = useState('ALL');
  useEffect(() => { setBranch(focus || 'ALL'); }, [focus]);

  // Branch in the query key → each branch scope fetches its own per-ledger list;
  // 60s refetch keeps it live and a page refresh always re-reads the DB.
  const q = useQuery({
    queryKey: ['tk', 'monitor', 'setup-tasks', branch],
    queryFn: () => getSetupTasks(branch),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  // Development issues — same cache key as Dev Control / the Development tab.
  const devQ = useQuery({ queryKey: ['dev-control', 'status'], queryFn: getDevFindings, staleTime: 30_000 });
  const trackMap = {};
  (devQ.data || []).forEach((r) => { trackMap[r.itemId] = r; });

  const d = q.data || {};
  const devRows = devFindingRows(DEV_ITEMS, trackMap);
  const tasks = combineTasks(d, devRows);
  const { pending, done } = taskRows(tasks, branch, user);
  const kpis = taskKpis(d, tasks, branch, user);
  const uCounts = userCounts(tasks, branch);
  const bCounts = branchCounts(tasks, d.branches || [], user);
  const lg = ledgerScope(d, branch);
  const parties = partyRows(d, branch);
  const showParties = user === 'ALL' || user === 'FM';

  if (q.isError) return <BandError label="setup task list" onRetry={q.refetch} />;

  return (
    <div className="grid gap-4">
      {/* Branch sub-selector — hidden when the top selector already spotlights a branch */}
      {focus === 'ALL' && (
        <div className="flex flex-wrap items-center gap-2" data-testid="tk-tasks-branchbar">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-subtle">Branch</span>
          {['ALL', 'Central', ...(d.branches || [])].map((b) => (
            <ScopePill key={b} on={branch === b} onClick={() => setBranch(b)} testId={`tk-tasks-branch-${b}`}>
              {b === 'ALL' ? 'All' : b} <span className="tabular-nums opacity-80">{bCounts[b] ?? 0}</span>
            </ScopePill>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2" data-testid="tk-tasks-userbar">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-subtle">User</span>
        {['ALL', ...TASK_USERS].map((u) => (
          <ScopePill key={u} on={user === u} onClick={() => setUser(u)} testId={`tk-tasks-user-${u}`}>
            {u === 'ALL' ? 'All users' : assigneeLabel(u)} <span className="tabular-nums opacity-80">{uCounts[u] ?? 0}</span>
          </ScopePill>
        ))}
      </div>

      <ResponsiveGrid min="150px" gap="md" data-testid="tk-tasks-kpis">
        {kpis.map((k) => <KpiTile key={k.key} label={k.label} value={k.value} color="#1a1c22" />)}
      </ResponsiveGrid>

      <PageSection title="How the Task List works">
        <p className="text-xs text-ink-muted">
          <b>Purely configuration</b> — the ERP deep-scans every module and sub-module on each refresh and lists what
          must be <b>configured</b> for the system to run live. Entries are never counted: a module is not "not started"
          for having no vouchers, and a client/supplier task is about its <b>master details being complete</b>, not its
          entries. Every row is judged by a <b>live check</b> and moves to Configured on its own. All configuration is
          owned by <b>FM (Faiz)</b>; all development issues (from the developer registry, with their remarks) by
          <b> Developer</b> — cleared in Dev Control; the two activations by <b>Owner (Afshin)</b>.
        </p>
      </PageSection>

      <DataTable
        title={`To configure (${pending.length})${branch === 'ALL' ? '' : ` · ${branch}`}${user === 'ALL' ? '' : ` · ${assigneeLabel(user)}`}`}
        columns={taskColumns(setRoute, true)}
        rows={pending}
        getRowKey={(r) => r.id}
        loading={q.isLoading}
        emptyMessage="Nothing left to configure in this scope. 🎉"
        searchable
        showDensityToggle={false}
        zebra
      />

      <DataTable
        title={`Configured — moved here automatically (${done.length})`}
        columns={taskColumns(setRoute, false)}
        rows={done}
        getRowKey={(r) => r.id}
        loading={q.isLoading}
        emptyMessage="Nothing configured yet in this scope."
        searchable={false}
        showDensityToggle={false}
        zebra
      />

      {showParties && (
        <PageSection title="Master completeness — details to fill">
          <p className="mb-3 text-xs text-ink-muted">
            Entry or no entry, every client, supplier and employee must have complete master details. Each row lists
            exactly which details are missing; it clears the moment they are saved. Inter-branch (Travkings) accounts
            need credit limit + credit days only; B2C-Ref pools are excluded; inactive employees owe nothing.
            Scope follows the Branch bar — branchwise details never mix.
          </p>
          <div className="grid gap-4">
            <DataTable
              title={`Customers with missing details (${parties.customers.items.length})${parties.customers.capped ? ' — first page' : ''}`}
              columns={partyColumns(setRoute, '/masters/customers')}
              rows={parties.customers.items}
              getRowKey={(r) => `${r.branch}:${r.name}:${r.sr}`}
              loading={q.isLoading}
              emptyMessage="Every customer in this scope has complete details. 🎉"
              searchable
              showDensityToggle={false}
              zebra
            />
            <DataTable
              title={`Suppliers with missing details (${parties.suppliers.items.length})${parties.suppliers.capped ? ' — first page' : ''}`}
              columns={partyColumns(setRoute, '/masters/suppliers')}
              rows={parties.suppliers.items}
              getRowKey={(r) => `${r.branch}:${r.name}:${r.sr}`}
              loading={q.isLoading}
              emptyMessage="Every supplier in this scope has complete details. 🎉"
              searchable
              showDensityToggle={false}
              zebra
            />
            <DataTable
              title={`Employees with missing details (${parties.employees.items.length})${parties.employees.capped ? ' — first page' : ''}`}
              columns={partyColumns(setRoute, '/hr/employees')}
              rows={parties.employees.items}
              getRowKey={(r) => `${r.branch}:${r.name}:${r.sr}`}
              loading={q.isLoading}
              emptyMessage="Every active employee in this scope has complete details. 🎉"
              searchable
              showDensityToggle={false}
              zebra
            />
          </div>
        </PageSection>
      )}

      <PageSection title="Ledger configuration — opening balances">
        <p className="mb-3 text-xs text-ink-muted">
          Editable ledgers still missing an opening balance. Locked <span className="font-mono">~*</span> wired/system
          heads are posting-driven and correctly excluded. A row clears the moment its opening is saved on the
          Ledgers master. Scope follows the Branch bar.
        </p>
        {lg.mode === 'central' && (
          <p className="text-xs text-ink-subtle">Opening balances are branch-scoped — pick a branch on the bar above.</p>
        )}
        {lg.mode === 'all' && (
          <ResponsiveGrid min="150px" gap="md" data-testid="tk-tasks-ledgercards">
            {lg.byBranch.map((b) => (
              <button key={b.branch} type="button" onClick={() => setBranch(b.branch)}
                className="rounded-lg border border-surface-border bg-surface p-3 text-left hover:border-accent">
                <div className="flex items-baseline justify-between gap-2">
                  <b className="text-[12.5px] text-ink">{b.branch}</b>
                  <span className="tabular-nums text-[11px] text-ink-subtle">{b.entered}/{b.total} set</span>
                </div>
                <div className="mt-1 text-[20px] font-bold tabular-nums text-ink">{b.pending}</div>
                <div className="text-[10.5px] text-ink-subtle">awaiting opening — click to drill in</div>
              </button>
            ))}
          </ResponsiveGrid>
        )}
        {lg.mode === 'branch' && (
          <DataTable
            title={`Ledgers awaiting opening balance · ${branch} (${lg.pending})${(d.ledgers || {}).capped ? ' — first page' : ''}`}
            columns={ledgerColumns(setRoute)}
            rows={ledgerRows(d)}
            getRowKey={(r) => `${r.code || r.name}`}
            loading={q.isLoading}
            emptyMessage={`Every editable ${branch} ledger has its opening balance. 🎉`}
            searchable
            showDensityToggle={false}
            zebra
          />
        )}
      </PageSection>
    </div>
  );
}
