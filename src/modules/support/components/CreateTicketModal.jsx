import React, { useState } from 'react';
import { Modal } from '../../../core/ux/Modal';
import { Button, FormField, Input, Select, Textarea } from '../../../shell/primitives';
import { toastSuccess, toastError } from '../../../core/ux/toast';
import { useCreateTicket } from '../hooks/use-tickets';
import { TICKET_TYPES, TICKET_PRIORITIES, currentUser, moduleForRoute } from '../services/support.service';

/**
 * Raise-a-ticket dialog — shared by the Support page's "Raise Ticket" button and
 * the app-wide floating "Report an issue" button, so the capture form is identical
 * everywhere. It auto-attaches the page/module/browser context (this app stores
 * link metadata, never binary uploads), so a one-line report is still actionable.
 *
 * Props:
 *   route       — the current route (auto-captured as pageUrl + module)
 *   onClose()   — dismiss the dialog
 *   onCreated(ticket) — optional; fired after a successful create
 */
export function CreateTicketModal({ route, onClose, onCreated }) {
  const captureRoute = route || (typeof window !== 'undefined' ? window.location.pathname : '');
  const user = currentUser();
  const [form, setForm] = useState({ title: '', type: 'bug', priority: 'medium', description: '', linkUrl: '' });
  const [touched, setTouched] = useState(false);
  const create = useCreateTicket();

  const set = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));
  const titleError = touched && !form.title.trim() ? 'A short title is required.' : '';

  const submit = () => {
    setTouched(true);
    if (!form.title.trim()) return;
    const body = {
      title: form.title.trim(),
      type: form.type,
      priority: form.priority,
      description: form.description.trim(),
      module: moduleForRoute(captureRoute),
      pageUrl: captureRoute,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      branch: user.branch || '',
      attachments: form.linkUrl.trim() ? [{ name: 'Reference link', url: form.linkUrl.trim() }] : [],
    };
    create.mutate(body, {
      onSuccess: (ticket) => {
        toastSuccess(`Ticket ${ticket?.ref || ''} raised — thank you!`);
        onCreated?.(ticket);
        onClose?.();
      },
      onError: (err) => toastError(err?.message || 'Could not raise the ticket. Please try again.'),
    });
  };

  return (
    <Modal
      title="Raise a support ticket"
      sub="Report a bug, error, or request a change / improvement — this reaches the whole team."
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={create.isPending} onClick={submit}>
            {create.isPending ? 'Sending…' : 'Raise ticket'}
          </Button>
        </>
      )}
    >
      <div className="flex flex-col gap-3 p-4">
        <FormField label="Title" required error={titleError}>
          <Input
            value={form.title}
            onChange={set('title')}
            placeholder="e.g. Trial Balance export crashes on large date range"
            maxLength={200}
            autoFocus
          />
        </FormField>

        <div className="grid grid-cols-1 gap-3 tablet:grid-cols-2">
          <FormField label="Type" required>
            <Select value={form.type} onChange={set('type')}>
              {TICKET_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </FormField>
          <FormField label="Priority" required>
            <Select value={form.priority} onChange={set('priority')}>
              {TICKET_PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
          </FormField>
        </div>

        <FormField label="Description" hint="Steps to reproduce, what you expected, and what actually happened.">
          <Textarea
            value={form.description}
            onChange={set('description')}
            rows={5}
            placeholder="Describe the issue or the change you'd like…"
            maxLength={8000}
          />
        </FormField>

        <FormField label="Screenshot / reference link (optional)" hint="Paste a link to a screenshot or document — file uploads aren't supported yet.">
          <Input value={form.linkUrl} onChange={set('linkUrl')} placeholder="https://…" type="url" />
        </FormField>

        {/* Auto-captured context — reassure the user we already know the where/what. */}
        <div className="rounded-md border border-surface-border bg-surface-alt px-3 py-2 text-[11px] text-ink-muted">
          Auto-attached: page <span className="font-semibold text-ink">{captureRoute || '—'}</span>
          {moduleForRoute(captureRoute) && <> · module <span className="font-semibold text-ink">{moduleForRoute(captureRoute)}</span></>}
          {user.branch && <> · branch <span className="font-semibold text-ink">{user.branch}</span></>}
          · your name & browser info
        </div>
      </div>
    </Modal>
  );
}

export default CreateTicketModal;
