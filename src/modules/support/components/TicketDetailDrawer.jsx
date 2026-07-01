import React, { useState } from 'react';
import { Trash2, Send, ExternalLink } from 'lucide-react';
import { Drawer, Button, StatusPill, FormField, Select, Textarea, Input } from '../../../shell/primitives';
import { confirmDialog } from '../../../core/ux/confirm';
import { toastSuccess, toastError } from '../../../core/ux/toast';
import { useUpdateTicket, useAddComment, useDeleteTicket } from '../hooks/use-tickets';
import {
  TICKET_TYPES, TICKET_PRIORITIES, TICKET_STATUSES,
  typeMeta, priorityMeta, statusMeta, canDeleteTickets,
} from '../services/support.service';

const fmtWhen = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return String(d); }
};

/**
 * Ticket detail — a right-hand slide-over showing the full ticket, its comment
 * thread and the inline triage controls. The board is collaborative, so every
 * authenticated user can move status / priority / type / assignee and comment;
 * only a hard delete is gated to senior roles (mirrors the backend).
 */
export function TicketDetailDrawer({ ticket, onClose }) {
  const update = useUpdateTicket();
  const addComment = useAddComment();
  const del = useDeleteTicket();
  const [comment, setComment] = useState('');
  const canDelete = canDeleteTickets();

  if (!ticket) return null;

  const patch = (field, value) => {
    update.mutate({ id: ticket.id, patch: { [field]: value } }, {
      onSuccess: () => toastSuccess('Ticket updated.'),
      onError: (e) => toastError(e?.message || 'Update failed.'),
    });
  };

  const postComment = () => {
    const body = comment.trim();
    if (!body) return;
    addComment.mutate({ id: ticket.id, body: { body } }, {
      onSuccess: () => { setComment(''); toastSuccess('Comment added.'); },
      onError: (e) => toastError(e?.message || 'Could not add the comment.'),
    });
  };

  const remove = async () => {
    const { confirmed } = await confirmDialog({
      title: 'Delete this ticket?',
      message: `${ticket.ref} — "${ticket.title}" will be permanently removed. This cannot be undone.`,
      confirmLabel: 'Delete', danger: true,
    });
    if (!confirmed) return;
    del.mutate(ticket.id, {
      onSuccess: () => { toastSuccess('Ticket deleted.'); onClose?.(); },
      onError: (e) => toastError(e?.message || 'Delete failed.'),
    });
  };

  const events = Array.isArray(ticket.events) ? ticket.events : [];
  const comments = Array.isArray(ticket.comments) ? ticket.comments : [];
  const attachments = Array.isArray(ticket.attachments) ? ticket.attachments : [];

  return (
    <Drawer
      open
      onClose={onClose}
      width="lg"
      title={ticket.ref || 'Ticket'}
      subtitle={ticket.title}
      footer={(
        <div className="flex w-full items-center justify-between">
          {canDelete
            ? <Button variant="danger" size="sm" icon={Trash2} loading={del.isPending} onClick={remove}>Delete</Button>
            : <span />}
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </div>
      )}
    >
      <div className="flex flex-col gap-4 p-4">
        {/* Current state pills */}
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={statusMeta(ticket.status).tone}>{statusMeta(ticket.status).label}</StatusPill>
          <StatusPill tone={typeMeta(ticket.type).tone} size="sm">{typeMeta(ticket.type).label}</StatusPill>
          <StatusPill tone={priorityMeta(ticket.priority).tone} size="sm">{priorityMeta(ticket.priority).label}</StatusPill>
        </div>

        {/* Meta */}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <dt className="text-ink-subtle">Raised by</dt>
          <dd className="text-ink">{ticket.raisedByName || ticket.raisedBy || '—'}</dd>
          <dt className="text-ink-subtle">Raised</dt>
          <dd className="text-ink">{fmtWhen(ticket.createdAt)}</dd>
          <dt className="text-ink-subtle">Module</dt>
          <dd className="text-ink">{ticket.module || '—'}{ticket.branch ? ` · ${ticket.branch}` : ''}</dd>
          <dt className="text-ink-subtle">Page</dt>
          <dd className="truncate text-ink" title={ticket.pageUrl}>{ticket.pageUrl || '—'}</dd>
        </dl>

        {/* Inline triage controls */}
        <div className="grid grid-cols-1 gap-3 rounded-brand border border-surface-border bg-surface-alt p-3 tablet:grid-cols-2">
          <FormField label="Status">
            <Select value={ticket.status} onChange={(e) => patch('status', e.target.value)} disabled={update.isPending}>
              {TICKET_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          </FormField>
          <FormField label="Priority">
            <Select value={ticket.priority} onChange={(e) => patch('priority', e.target.value)} disabled={update.isPending}>
              {TICKET_PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
          </FormField>
          <FormField label="Type">
            <Select value={ticket.type} onChange={(e) => patch('type', e.target.value)} disabled={update.isPending}>
              {TICKET_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </FormField>
          <FormField label="Assigned to (email)">
            <Input
              defaultValue={ticket.assignedTo || ''}
              placeholder="unassigned"
              onBlur={(e) => { if ((e.target.value || '') !== (ticket.assignedTo || '')) patch('assignedTo', e.target.value.trim()); }}
            />
          </FormField>
        </div>

        {/* Description */}
        {ticket.description && (
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Description</div>
            <p className="whitespace-pre-wrap rounded-brand border border-surface-border bg-surface p-3 text-xs text-ink">{ticket.description}</p>
          </div>
        )}

        {/* Attachments (links) */}
        {attachments.length > 0 && (
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Links</div>
            <ul className="flex flex-col gap-1">
              {attachments.map((a, i) => (
                <li key={i}>
                  <a href={a.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-info hover:underline">
                    <ExternalLink size={12} />{a.name || a.url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Comments thread */}
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            Discussion {comments.length > 0 && <span className="text-ink-subtle">({comments.length})</span>}
          </div>
          {comments.length === 0
            ? <p className="text-xs text-ink-subtle">No comments yet — start the discussion below.</p>
            : (
              <ul className="flex flex-col gap-2">
                {comments.map((c, i) => (
                  <li key={i} className="rounded-brand border border-surface-border bg-surface p-2.5">
                    <div className="mb-0.5 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-ink">{c.byName || c.by || 'User'}</span>
                      <span className="text-[10px] text-ink-subtle">{fmtWhen(c.at)}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-xs text-ink-muted">{c.body}</p>
                  </li>
                ))}
              </ul>
            )}

          {/* Add comment */}
          <div className="mt-3 flex flex-col gap-2">
            <Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" />
            <div className="flex justify-end">
              <Button variant="primary" size="sm" icon={Send} loading={addComment.isPending} disabled={!comment.trim()} onClick={postComment}>
                Comment
              </Button>
            </div>
          </div>
        </div>

        {/* Audit trail */}
        {events.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-ink-muted">History ({events.length})</summary>
            <ul className="mt-2 flex flex-col gap-1 border-l border-surface-border pl-3">
              {events.map((ev, i) => (
                <li key={i} className="text-ink-subtle">
                  <span className="font-medium text-ink-muted">{ev.byName || ev.by || 'System'}</span>{' '}
                  {ev.action === 'created' ? 'created the ticket'
                    : ev.action === 'comment' ? 'commented'
                    : ev.action === 'assigned' ? `assigned to ${ev.to || 'nobody'}`
                    : `changed ${ev.action} ${ev.from ? `from ${ev.from} ` : ''}to ${ev.to}`}
                  <span className="ml-1 text-[10px]">· {fmtWhen(ev.at)}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </Drawer>
  );
}

export default TicketDetailDrawer;
