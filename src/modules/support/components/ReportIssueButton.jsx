import React, { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { CreateTicketModal } from './CreateTicketModal';

/**
 * App-wide floating "Report an issue" button — mounted once as a global host (see
 * App.jsx, alongside ToastHost). Any screen can raise a ticket in one click; the
 * dialog auto-captures the CURRENT route so the report lands with its context.
 * `route` is the app's live route (passed from App). Sits below modals (z-40 <
 * the z-9000 modal layer) and hides itself while its own dialog is open.
 */
export function ReportIssueButton({ route }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Report a bug or request a change"
          aria-label="Report an issue"
          className="noprint fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-navy px-4 py-3 text-[13px] font-semibold text-white shadow-brand-lg ring-1 ring-white/10 transition-all duration-fast ease-premium hover:bg-navy-light active:scale-[0.98] max-tablet:px-3.5"
        >
          <MessageSquarePlus size={18} className="shrink-0" />
          <span className="max-tablet:hidden">Report an issue</span>
        </button>
      )}
      {open && <CreateTicketModal route={route} onClose={() => setOpen(false)} />}
    </>
  );
}

export default ReportIssueButton;
