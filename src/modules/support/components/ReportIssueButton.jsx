import React, { Suspense, useState } from 'react';

const CreateTicketModal = React.lazy(() => import('./CreateTicketModal').then((m) => ({ default: m.CreateTicketModal })));

const DIM = '#5a6691', LINE = '#e1e3ec';

/**
 * Reusable "Report an issue" trigger — a small bordered pill (matches the
 * ContextBar "Recent" button) that opens the raise-a-ticket dialog. Any
 * screen can mount it inline; the dialog auto-captures `route` for context.
 * `route` — the current route (passed through to CreateTicketModal).
 */
export function ReportIssueButton({ route }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Report a bug or request a change"
        aria-label="Report an issue"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 9px', fontSize: 11, fontWeight: 600, color: DIM, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 6, cursor: 'pointer', flexShrink: 0 }}
      >
        🚩 Report an issue
      </button>
      {open && (
        <Suspense fallback={null}>
          <CreateTicketModal route={route} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}

export default ReportIssueButton;
