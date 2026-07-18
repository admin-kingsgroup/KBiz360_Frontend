import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReconList, saveRecon, deleteRecon } from './api';
import { BRANCHES, ACCOUNT_TYPES, defaultPeriod, periodEndDate, statusTone, reconSummary } from './utils';
import { PageSection, ResponsiveGrid, Badge, Button, Input, Select, FormField, isViewOnly } from '../../shell/primitives';
import { KpiTile } from '../dashboard/components/cards/KpiTile';
import { DataTable } from '../../shell/DataTable';

// ─── Reconciliation Status (team-marked, feeds the Control Tower gate) ────────
// The team keeps reconciling bank / client / supplier accounts MANUALLY against the
// physical statement — this screen just lets them TICK each account "Reconciled" for a
// month (with the date). The Control Tower reads it to show, and gate, what's still
// pending per branch. Nothing here posts to the books.

export function ReconStatusPage() {
  const qc = useQueryClient();
  const [branch, setBranch] = useState('BOM');
  const [period, setPeriod] = useState(defaultPeriod());
  const [account, setAccount] = useState('');
  const [accountType, setAccountType] = useState('bank');

  const key = ['recon-status', branch, period];
  const { data: rows = [], isLoading, isError } = useQuery({ queryKey: key, queryFn: () => getReconList({ branch, period }) });
  const invalidate = () => qc.invalidateQueries({ queryKey: key });
  const save = useMutation({ mutationFn: saveRecon, onSuccess: invalidate });
  const del = useMutation({ mutationFn: deleteRecon, onSuccess: invalidate });
  const vo = isViewOnly();

  const s = reconSummary(rows);
  const addAccount = () => {
    if (!account.trim()) return;
    save.mutate({ branch, account: account.trim(), accountType, period, status: 'pending' });
    setAccount('');
  };
  const toggle = (r) => save.mutate({
    branch, account: r.account, accountType: r.accountType, period,
    status: r.status === 'reconciled' ? 'pending' : 'reconciled',
    reconciledUpTo: r.status === 'reconciled' ? '' : periodEndDate(period),
  });

  const columns = [
    { key: 'account', header: 'Account', render: (r) => <b className="text-ink">{r.account}</b> },
    { key: 'accountType', header: 'Type', render: (r) => <span className="capitalize text-ink-muted">{r.accountType}</span> },
    { key: 'status', header: 'Status', align: 'center', render: (r) => <Badge tone={statusTone(r.status)} size="sm">{r.status === 'reconciled' ? 'Reconciled' : 'Pending'}</Badge> },
    { key: 'reconciledUpTo', header: 'Up to', render: (r) => <span className="tabular-nums text-ink-muted">{r.reconciledUpTo || '—'}</span> },
    { key: 'by', header: 'By', render: (r) => <span className="text-ink-subtle">{r.by || '—'}</span> },
    { key: 'act', header: '', align: 'right', render: (r) => (
      <span className="flex justify-end gap-1.5">
        <Button size="sm" write variant={r.status === 'reconciled' ? 'ghost' : 'primary'} onClick={() => toggle(r)}>
          {r.status === 'reconciled' ? 'Mark pending' : 'Mark reconciled'}
        </Button>
        <Button size="sm" write variant="ghost" onClick={() => del.mutate(r._id)} aria-label={`Remove ${r.account}`}>✕</Button>
      </span>
    ) },
  ];

  return (
    <div className="grid gap-4 px-4 py-4 tablet:px-6 tablet:py-5 desktop:px-8">
      <p className="text-sm text-ink-muted max-w-3xl">
        Mark each bank / client / supplier account <b>Reconciled</b> for the month once you've matched the physical statement to the ERP.
        The <b>Control Tower</b> reads this to show and gate what reconciliation is still pending — you keep reconciling exactly as you do now.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <FormField label="Branch"><Select value={branch} onChange={(e) => setBranch(e.target.value)}>{BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}</Select></FormField>
        <FormField label="Period"><Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} /></FormField>
      </div>

      <ResponsiveGrid min="150px" gap="md">
        <KpiTile label="Accounts tracked" value={`${s.total}`} sub={`${branch} · ${period}`} color="#1a1c22" />
        <KpiTile label="Reconciled" value={`${s.reconciled}`} sub="matched to statement" color="#1a7a4c" />
        <KpiTile label="Pending" value={`${s.pending}`} sub="still to reconcile" color={s.pending ? '#b23b3b' : '#1a7a4c'} />
      </ResponsiveGrid>

      <PageSection title="Add an account to track">
        <div className="flex flex-wrap items-end gap-3">
          <FormField label="Account name" className="min-w-[220px]"><Input value={account} placeholder="e.g. ICICI Bank" onChange={(e) => setAccount(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !vo) addAccount(); }} /></FormField>
          <FormField label="Type"><Select value={accountType} onChange={(e) => setAccountType(e.target.value)}>{ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select></FormField>
          <Button write onClick={addAccount} disabled={!account.trim() || save.isPending}>Add</Button>
        </div>
      </PageSection>

      <DataTable
        title={`Reconciliation — ${branch} · ${period}`}
        columns={columns}
        rows={rows}
        getRowKey={(r) => r._id || `${r.account}:${r.period}`}
        loading={isLoading}
        isError={isError}
        emptyMessage="No accounts tracked yet — add the banks and parties you reconcile."
        searchable
        showDensityToggle={false}
        zebra
      />
    </div>
  );
}
