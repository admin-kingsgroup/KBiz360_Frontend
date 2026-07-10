/* ════════════════════════════════════════════════════════════════════
   Reports ▸ Saved Report Views — live via /api/report-views.
   ════════════════════════════════════════════════════════════════════
   Lists MY views + views the team SHARED. Open re-runs the view: builder
   views land on the Custom Report Builder preloaded with their saved config
   (via builderShared's pending-config stash); route views navigate straight
   to that report screen. Rename / share-toggle / delete persist through the
   generic master mutations. Only the owner can rename, re-share or delete.
   ──────────────────────────────────────────────────────────────────── */

import React, { useMemo, useState } from 'react';
import { FolderOpen, Pencil, Trash2, Play, Hammer } from 'lucide-react';
import { useMasterList, useMasterMutations } from '../../../core/useMasters';
import { toastError, toastSuccess } from '../../../core/ux/toast';
import { PageLayout } from '../../../shell/PageLayout';
import { DataTable } from '../../../shell/DataTable';
import { PageSection, Button, Input, FormField, Modal, Switch, StatusPill, EmptyState, Select } from '../../../shell/primitives';
import { stashBuilderConfig, currentUserEmail, describeConfig } from '../builderShared';

export function SavedReportViews({ setRoute }) {
  const me = currentUserEmail();
  const { data = [], isLoading } = useMasterList('report-views');
  const { update, remove } = useMasterMutations('report-views');
  const [scope, setScope] = useState('all');            // all | mine | shared
  const [renaming, setRenaming] = useState(null);       // view being renamed
  const [newName, setNewName] = useState('');

  const isMine = (v) => !v.owner || v.owner === me;
  const views = useMemo(() => (data || [])
    .filter((v) => v.active !== false)
    .filter((v) => v.shared || isMine(v))               // mine + shared — never someone else's private view
    .filter((v) => (scope === 'mine' ? isMine(v) : scope === 'shared' ? v.shared : true)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [data, scope, me]);

  const openView = (v) => {
    if (!setRoute) return;
    if (v.report === 'builder' || (v.config && v.config.source)) {
      stashBuilderConfig({ ...(v.config || {}), name: v.name });
      setRoute('/reports/builder');
    } else if (v.report) {
      setRoute(v.report);
    }
  };

  const toggleShared = (v) => update.mutate(
    { id: v.id, body: { shared: !v.shared } },
    { onError: (e) => toastError(e.message || 'Could not update the view') },
  );

  const rename = () => update.mutate(
    { id: renaming.id, body: { name: newName.trim() } },
    { onSuccess: () => { setRenaming(null); toastSuccess('View renamed.'); }, onError: (e) => toastError(e.message || 'Rename failed') },
  );

  const del = (v) => {
    if (!window.confirm(`Delete the saved view “${v.name}”? This cannot be undone.`)) return;
    remove.mutate(v.id, { onError: (e) => toastError(e.message || 'Delete failed') });
  };

  const columns = [
    { key: 'name', header: 'View', render: (v) => (
      <div>
        <p className="font-semibold text-ink">{v.name}</p>
        <p className="text-[11px] text-ink-muted">{v.report === 'builder' || (v.config && v.config.source) ? describeConfig(v.config) : v.report}</p>
      </div>
    ) },
    { key: 'report', header: 'Kind', render: (v) => (
      v.report === 'builder' || (v.config && v.config.source)
        ? <StatusPill size="sm" tone="info">Builder query</StatusPill>
        : <StatusPill size="sm" tone="neutral">Report link</StatusPill>
    ) },
    { key: 'owner', header: 'Owner', render: (v) => (isMine(v) ? 'Me' : (v.owner || '—')) },
    { key: 'shared', header: 'Shared', align: 'center', render: (v) => (
      <Switch checked={!!v.shared} disabled={!isMine(v)} onChange={() => toggleShared(v)} label="" />
    ) },
    { key: 'updatedAt', header: 'Updated', render: (v) => String(v.updatedAt || '').slice(0, 10) || '—' },
    { key: '__act', header: 'Actions', align: 'center', sortable: false, hideable: false, render: (v) => (
      <div className="flex justify-center gap-1.5 whitespace-nowrap">
        <Button variant="primary" size="xs" icon={Play} onClick={() => openView(v)}>Open</Button>
        <Button variant="secondary" size="xs" icon={Pencil} disabled={!isMine(v)} onClick={() => { setRenaming(v); setNewName(v.name); }}>Rename</Button>
        <Button variant="secondary" size="xs" icon={Trash2} className="text-maroon" disabled={!isMine(v)} onClick={() => del(v)}>Delete</Button>
      </div>
    ) },
  ];

  return (
    <PageLayout
      title="Saved Report Views"
      subtitle="Your saved builder queries and report bookmarks, plus everything the team shared. Open re-runs a view exactly as it was saved."
      filters={
        <div className="w-44">
          <Select value={scope} onChange={(e) => setScope(e.target.value)} aria-label="Scope">
            <option value="all">All views</option>
            <option value="mine">My views</option>
            <option value="shared">Shared with team</option>
          </Select>
        </div>
      }
    >
      {!isLoading && views.length === 0 ? (
        <PageSection>
          <EmptyState
            icon={FolderOpen}
            title="No saved views yet"
            hint="Build a query in the Custom Report Builder and press “Save as view” — it appears here for one-click re-runs."
            action={setRoute && <Button variant="primary" size="sm" icon={Hammer} onClick={() => setRoute('/reports/builder')}>Open the Report Builder</Button>}
          />
        </PageSection>
      ) : (
        <DataTable
          columns={columns}
          rows={views}
          getRowKey={(v) => v.id}
          loading={isLoading}
          emptyMessage="No saved views."
          initialSort={{ key: 'updatedAt', dir: 'desc' }}
          stickyHeader
          maxHeight="70vh"
        />
      )}

      {renaming && (
        <Modal
          title="Rename view"
          onClose={() => setRenaming(null)}
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setRenaming(null)}>Cancel</Button>
              <Button variant="primary" size="sm" disabled={!newName.trim() || update.isPending} onClick={rename}>{update.isPending ? 'Saving…' : 'Save'}</Button>
            </>
          }
        >
          <div className="p-4">
            <FormField label="View name" required>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </FormField>
          </div>
        </Modal>
      )}
    </PageLayout>
  );
}

export default SavedReportViews;
