/* ════════════════════════════════════════════════════════════════════
   Reports ▸ Scheduled Email Reports — live via /api/report-schedules.
   ════════════════════════════════════════════════════════════════════
   A schedule runs a Saved Report View through the same run engine as the
   Custom Report Builder and emails the result as an HTML table (backend
   hourly cron; daily / weekly / monthly + hour anchors). With no SMTP
   configured on the server the run is recorded as 'smtp-not-configured' —
   shown honestly in the Status column instead of pretending it sent.
   Run-now triggers the same engine immediately.
   ──────────────────────────────────────────────────────────────────── */

import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Zap, CalendarClock } from 'lucide-react';
import { apiPost } from '../../../core/api';
import { useMasterList, useMasterMutations } from '../../../core/useMasters';
import { toastSuccess, toastError, toastWarning } from '../../../core/ux/toast';
import { PageLayout } from '../../../shell/PageLayout';
import { DataTable } from '../../../shell/DataTable';
import { PageSection, Button, Input, Select, FormField, Modal, Switch, StatusPill, EmptyState } from '../../../shell/primitives';
import { describeConfig } from './builderShared';

const FREQS = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly (Mondays)' },
  { key: 'monthly', label: 'Monthly (1st)' },
];
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const hh = (h) => `${String(h).padStart(2, '0')}:00`;

const blankForm = { name: '', viewId: '', recipients: '', freq: 'daily', hour: 8 };

function statusPill(s) {
  const v = String(s || '');
  if (!v) return <span className="text-ink-subtle">—</span>;
  if (v === 'sent') return <StatusPill size="sm" tone="success">Sent</StatusPill>;
  if (v === 'smtp-not-configured') return <StatusPill size="sm" tone="warning">SMTP not configured</StatusPill>;
  if (v === 'no-recipients') return <StatusPill size="sm" tone="warning">No recipients</StatusPill>;
  return <StatusPill size="sm" tone="danger">{v.length > 42 ? `${v.slice(0, 42)}…` : v}</StatusPill>;
}

export function ScheduledReports() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useMasterList('report-schedules');
  const { data: views = [] } = useMasterList('report-views');
  const { create, update, remove } = useMasterMutations('report-schedules');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(blankForm);
  const setF = (f) => setForm((p) => ({ ...p, ...f }));

  const viewById = useMemo(() => {
    const m = {};
    (views || []).forEach((v) => { m[v.id] = v; });
    return m;
  }, [views]);
  const reportLabel = (s) => {
    if (s.report && typeof s.report === 'object') return `Builder query — ${describeConfig(s.report)}`;
    const v = viewById[String(s.report)];
    return v ? v.name : `Saved view ${String(s.report).slice(-6)}`;
  };

  const runNow = useMutation({
    mutationFn: (id) => apiPost(`/api/report-schedules/${id}/run-now`),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['master', 'report-schedules'] });
      if (r && r.sent) toastSuccess(`Report emailed to ${(r.to || []).join(', ')} (${r.rows} rows).`);
      else toastWarning(`Report ran (${r?.rows ?? 0} rows) but was not emailed — ${r?.reason || 'see status'}.`);
    },
    onError: (e) => {
      qc.invalidateQueries({ queryKey: ['master', 'report-schedules'] });
      toastError(e.message || 'Run failed');
    },
  });

  const createSchedule = () => {
    const recipients = form.recipients.split(/[,;\s]+/).map((r) => r.trim()).filter(Boolean);
    create.mutate(
      { name: form.name.trim(), report: form.viewId, recipients, freq: form.freq, hour: Number(form.hour) },
      {
        onSuccess: () => { setModal(false); setForm(blankForm); toastSuccess('Schedule created.'); },
        onError: (e) => toastError(e.message || 'Could not create the schedule'),
      },
    );
  };

  const toggleActive = (s) => update.mutate(
    { id: s.id, body: { active: !s.active } },
    { onError: (e) => toastError(e.message || 'Could not update the schedule') },
  );

  const del = (s) => {
    if (!window.confirm(`Delete the schedule “${s.name}”? Recipients will stop receiving this report.`)) return;
    remove.mutate(s.id, { onError: (e) => toastError(e.message || 'Delete failed') });
  };

  const columns = [
    { key: 'name', header: 'Schedule', render: (s) => (
      <div>
        <p className="font-semibold text-ink">{s.name}</p>
        <p className="text-[11px] text-ink-muted">{reportLabel(s)}</p>
      </div>
    ) },
    { key: 'freq', header: 'Frequency', render: (s) => `${(FREQS.find((f) => f.key === s.freq) || {}).label || s.freq} · ${hh(s.hour ?? 8)}` },
    { key: 'recipients', header: 'Recipients', render: (s) => {
      const r = s.recipients || [];
      if (!r.length) return <span className="text-ink-subtle">—</span>;
      return (
        <div>
          <p className="text-[12px]">{r[0]}</p>
          {r.length > 1 && <p className="text-[10.5px] text-ink-muted">+{r.length - 1} more</p>}
        </div>
      );
    } },
    { key: 'lastRun', header: 'Last run', render: (s) => (s.lastRun ? String(s.lastRun).slice(0, 16).replace('T', ' ') : '—') },
    { key: 'lastStatus', header: 'Status', align: 'center', render: (s) => statusPill(s.lastStatus) },
    { key: 'active', header: 'Active', align: 'center', render: (s) => <Switch checked={!!s.active} onChange={() => toggleActive(s)} label="" /> },
    { key: '__act', header: 'Actions', align: 'center', sortable: false, hideable: false, render: (s) => (
      <div className="flex justify-center gap-1.5 whitespace-nowrap">
        <Button variant="primary" size="xs" icon={Zap} disabled={runNow.isPending} onClick={() => runNow.mutate(s.id)}>Run now</Button>
        <Button variant="secondary" size="xs" icon={Trash2} className="text-maroon" onClick={() => del(s)}>Delete</Button>
      </div>
    ) },
  ];

  const savedViews = (views || []).filter((v) => v.active !== false);

  return (
    <PageLayout
      title="Scheduled Email Reports"
      subtitle="Auto-email a saved report view on a daily / weekly / monthly anchor. Runs go through the same live run engine as the Custom Report Builder; the Status column shows exactly what the last run did."
      actions={<Button variant="primary" size="sm" icon={Plus} onClick={() => { setForm(blankForm); setModal(true); }}>New Schedule</Button>}
    >
      {!isLoading && (data || []).length === 0 ? (
        <PageSection>
          <EmptyState
            icon={CalendarClock}
            title="No scheduled reports yet"
            hint="Create a schedule from a Saved Report View — the server runs it on its anchor and emails the result. (Emails need SMTP_HOST configured on the backend; until then runs record “smtp-not-configured”.)"
            action={<Button variant="primary" size="sm" icon={Plus} onClick={() => { setForm(blankForm); setModal(true); }}>New Schedule</Button>}
          />
        </PageSection>
      ) : (
        <DataTable
          columns={columns}
          rows={data || []}
          getRowKey={(s) => s.id}
          loading={isLoading}
          emptyMessage="No schedules."
          initialSort={{ key: 'name', dir: 'asc' }}
          stickyHeader
          maxHeight="70vh"
        />
      )}

      {modal && (
        <Modal
          title="New scheduled email report"
          sub="Pick a saved view, who gets it, and when."
          onClose={() => setModal(false)}
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setModal(false)}>Cancel</Button>
              <Button variant="primary" size="sm" disabled={!form.name.trim() || !form.viewId || !form.recipients.trim() || create.isPending} onClick={createSchedule}>
                {create.isPending ? 'Creating…' : 'Create Schedule'}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-3 p-4">
            <FormField label="Schedule name" required>
              <Input value={form.name} onChange={(e) => setF({ name: e.target.value })} placeholder="e.g. Weekly sales by party — management" />
            </FormField>
            <FormField label="Saved report view" required hint={savedViews.length ? undefined : 'No saved views yet — save one from the Custom Report Builder first.'}>
              <Select value={form.viewId} onChange={(e) => setF({ viewId: e.target.value })}>
                <option value="">Select a saved view…</option>
                {savedViews.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </Select>
            </FormField>
            <FormField label="Recipients (comma-separated emails)" required>
              <Input value={form.recipients} onChange={(e) => setF({ recipients: e.target.value })} placeholder="faiz.fm@travkings.com, afshin.dhanani@kingsgroupco.com" />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Frequency">
                <Select value={form.freq} onChange={(e) => setF({ freq: e.target.value })}>
                  {FREQS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                </Select>
              </FormField>
              <FormField label="Send at (server time)">
                <Select value={form.hour} onChange={(e) => setF({ hour: e.target.value })}>
                  {HOURS.map((h) => <option key={h} value={h}>{hh(h)}</option>)}
                </Select>
              </FormField>
            </div>
            <p className="text-[11px] text-ink-muted">
              A view saved without fixed dates is emailed with a rolling 30-day window ending on the send day, so recurring reports never go stale.
            </p>
          </div>
        </Modal>
      )}
    </PageLayout>
  );
}

export default ScheduledReports;
