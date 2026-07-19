import React, { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { PageLayout } from '../../../shell/PageLayout';
import { DataTable } from '../../../shell/DataTable';
import { Button, StatusPill } from '../../../shell/primitives';
import { toastError } from '../../../core/ux/toast';
import { useTickets, useTicketSummary } from '../hooks/use-tickets';
import { CreateTicketModal } from '../components/CreateTicketModal';
import { TicketDetailDrawer } from '../components/TicketDetailDrawer';
import { typeMeta, priorityMeta, statusMeta } from '../services/support.service';
import { takeSupportPrefill } from '../../../core/supportPrefill';

const fmtWhen = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: '2-digit' }); }
  catch { return String(d); }
};

// Board filters (also drive the query params sent to the backend).
const FILTERS = [
  { key: 'open', label: 'Open', params: { open: 1 } },
  { key: 'all', label: 'All', params: {} },
  { key: 'mine', label: 'Raised by me', params: { mine: 1 } },
  { key: 'bug', label: 'Bugs & errors', params: { type: 'bug' } },
  { key: 'feature', label: 'Requests', params: { type: 'feature' } },
  { key: 'resolved', label: 'Resolved', params: { status: 'resolved' } },
];

/**
 * Support Tickets — the in-app issue board. A thin page: server-state hooks +
 * PageLayout + DataTable + the shared create/detail dialogs. Every user can raise
 * a ticket, read the whole board, and triage (change status/priority/assignee) via
 * the detail drawer. Reached from the "Support" nav pill and the floating button.
 */
export function SupportTicketsPage({ route }) {
  // One-shot prefill handed over by the screen-number badge's "Report" action: open the
  // Raise-Ticket dialog seeded with the screen context — on mount (navigated here from
  // another screen), OR live via the 'kbiz:support-prefill' event when Report is clicked
  // while already on this page (where navigate() is a no-op and mount wouldn't re-run).
  const [prefill, setPrefill] = useState(() => takeSupportPrefill());
  const [prefillKey, setPrefillKey] = useState(0);
  const [filter, setFilter] = useState('open');
  const [createOpen, setCreateOpen] = useState(!!prefill);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const onPrefill = () => {
      const p = takeSupportPrefill();
      if (p) { setPrefill(p); setPrefillKey((k) => k + 1); setCreateOpen(true); }
    };
    window.addEventListener('kbiz:support-prefill', onPrefill);
    return () => window.removeEventListener('kbiz:support-prefill', onPrefill);
  }, []);

  const activeFilter = FILTERS.find((f) => f.key === filter) || FILTERS[0];
  const { data, isLoading, isError, error, refetch } = useTickets(activeFilter.params);
  const { data: summary } = useTicketSummary();

  const rows = Array.isArray(data) ? data : [];
  // Re-derive the open ticket from the freshest list so the drawer reflects edits.
  const selected = selectedId ? rows.find((t) => t.id === selectedId) || null : null;

  const columns = useMemo(() => [
    { key: 'ref', header: 'Ticket', width: '7rem', hideable: false, className: 'font-semibold text-navy' },
    { key: 'title', header: 'Title', hideable: false, render: (row) => (
      <span className="line-clamp-2">{row.title}</span>
    ) },
    { key: 'type', header: 'Type', align: 'center', width: '9rem',
      render: (row) => <StatusPill tone={typeMeta(row.type).tone} size="sm">{typeMeta(row.type).label}</StatusPill>,
      exportValue: (row) => typeMeta(row.type).label },
    { key: 'priority', header: 'Priority', align: 'center', width: '7rem',
      render: (row) => <StatusPill tone={priorityMeta(row.priority).tone} size="sm">{priorityMeta(row.priority).label}</StatusPill>,
      exportValue: (row) => priorityMeta(row.priority).label },
    { key: 'status', header: 'Status', align: 'center', width: '8rem',
      render: (row) => <StatusPill tone={statusMeta(row.status).tone}>{statusMeta(row.status).label}</StatusPill>,
      exportValue: (row) => statusMeta(row.status).label },
    { key: 'raisedByName', header: 'Raised by', width: '11rem', className: 'text-ink-muted',
      render: (row) => row.raisedByName || row.raisedBy || '—' },
    { key: 'createdAt', header: 'Raised', width: '7rem', align: 'right',
      render: (row) => fmtWhen(row.createdAt), sortValue: (row) => row.createdAt || '' },
  ], []);

  const subtitle = summary
    ? `${summary.total} total · ${summary.mine} raised by you`
    : 'Report bugs, errors, and anything you want added or improved';

  const filters = (
    <div className="flex flex-wrap items-center gap-1.5">
      {FILTERS.map((f) => (
        <button
          key={f.key}
          onClick={() => setFilter(f.key)}
          className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors duration-fast max-tablet:min-h-[44px] ${
            filter === f.key
              ? 'border-gold bg-gold-light/30 text-navy'
              : 'border-surface-border bg-surface text-ink-muted hover:bg-surface-alt'
          }`}
        >
          {f.label}
          {f.key === 'open' && summary?.byStatus?.open ? ` (${summary.byStatus.open})` : ''}
        </button>
      ))}
    </div>
  );

  return (
    <PageLayout
      title="Support Tickets"
      subtitle={subtitle}
      actions={<Button variant="primary" icon={Plus} onClick={() => { setPrefill(null); setPrefillKey((k) => k + 1); setCreateOpen(true); }}>Raise ticket</Button>}
      filters={filters}
    >
      <DataTable
        columns={columns}
        rows={rows}
        loading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => Promise.resolve(refetch?.()).catch(() => toastError('Retry failed — still unable to load tickets.'))}
        onRowClick={(row) => setSelectedId(row.id)}
        getRowKey={(r) => r.id}
        searchable
        searchPlaceholder="Search ticket / title / reporter…"
        stickyHeader
        pageSize={25}
        showColumnToggle
        exportName="support-tickets"
        printTitle="Support Tickets"
        initialSort={{ key: 'createdAt', dir: 'desc' }}
        emptyMessage="No tickets here."
        emptyHint="Raise the first one with the button above."
        title="Tickets"
      />

      {createOpen && (
        <CreateTicketModal
          key={prefillKey}
          route={prefill?.route || route}
          initial={prefill}
          onClose={() => { setCreateOpen(false); setPrefill(null); }}
          onCreated={(t) => setSelectedId(t?.id || null)}
        />
      )}
      {selected && (
        <TicketDetailDrawer ticket={selected} onClose={() => setSelectedId(null)} />
      )}
    </PageLayout>
  );
}

export default SupportTicketsPage;
