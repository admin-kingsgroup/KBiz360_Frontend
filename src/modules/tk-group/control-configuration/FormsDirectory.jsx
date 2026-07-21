import React from 'react';
import { Badge } from '../../../shell/primitives';
import { DataTable } from '../../../shell/DataTable';
import { FORM_DIRECTORY, FORM_DIRECTORY_MODULES } from '../utils/formsDirectory';
import { otherPages } from '../utils/pagesCatalog';
import { isCockpitRoute } from '../cockpit';
import { FOCUS_ALL } from '../utils/cockpitFocus';
import { toastInfo } from '../../../core/ux/toast';

// ─── Form Directory & Pages — every page in the ERP, one searchable directory ─
// Two tables: the data-creation forms (formsDirectory.js) and every other
// registered route (pagesCatalog.js), each with a one-click "Open →" that
// jumps straight there. Lives under TK Group ▸ Control Panel ▸ Form & Pages.
//
// A TK Group Central user with no branch Focused (focus === FOCUS_ALL) is held
// in the control cockpit — App.jsx's own guard bounces any non-cockpit route
// (vouchers, HR self-service, assets, reports, tax…) straight back to Control
// Tower (see isCockpitRoute / the useEffect in App.jsx). Without this check
// "Open →" on those rows looked like it silently did nothing (it actually
// navigated, then got bounced back). So: grey those rows out and say why,
// instead of letting the click round-trip.
function goToForm(row, setRoute, focus) {
  const blocked = focus === FOCUS_ALL && !isCockpitRoute(row.route);
  if (blocked) {
    toastInfo(`Focus a branch (top selector) to open "${row.name}" — it's a branch-operational page, not reachable in All-branches mode.`);
    return;
  }
  setRoute(row.route);
}

const directoryCols = (setRoute, focus) => [
  { key: 'module', header: 'Module', width: '11rem', render: (r) => <Badge tone="neutral" size="sm">{r.module}</Badge> },
  { key: 'name', header: 'Page', render: (r) => <span className="font-semibold text-ink">{r.name}</span> },
  { key: 'breadcrumb', header: 'Path', render: (r) => <span className="text-ink-muted">{r.breadcrumb}</span> },
  { key: 'route', header: 'Route', render: (r) => <code className="rounded bg-surface-alt px-1.5 py-0.5 text-[11px] text-ink-muted">{r.route}</code> },
  {
    key: 'action', header: '', sortable: false, hideable: false, align: 'right', exportable: false,
    render: (r) => {
      const blocked = focus === FOCUS_ALL && !isCockpitRoute(r.route);
      return (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); goToForm(r, setRoute, focus); }}
          title={blocked ? 'Focus a branch (top selector) to open this page' : undefined}
          className={blocked
            ? 'text-[11.5px] font-semibold text-ink-subtle cursor-not-allowed'
            : 'text-[11.5px] font-semibold text-accent hover:underline'}
        >
          {blocked ? 'Focus branch →' : 'Open →'}
        </button>
      );
    },
  },
];

export function FormsDirectory({ setRoute, focus }) {
  const forms = FORM_DIRECTORY;
  const pages = React.useMemo(() => otherPages(), []);
  const formCols = directoryCols(setRoute, focus);
  const pageCols = directoryCols(setRoute, focus);
  const blockedForms = focus === FOCUS_ALL ? forms.filter((r) => !isCockpitRoute(r.route)).length : 0;
  const blockedPages = focus === FOCUS_ALL ? pages.filter((r) => !isCockpitRoute(r.route)).length : 0;
  const blockedCount = blockedForms + blockedPages;
  return (
    <div className="grid gap-6">
      <div className="text-xs text-ink-muted">
        Every page in the ERP, one directory — <b className="text-ink">{forms.length + pages.length}</b> registered routes total:{' '}
        <b className="text-ink">{forms.length}</b> data-creation forms across <b className="text-ink">{FORM_DIRECTORY_MODULES.length}</b> modules,
        plus <b className="text-ink">{pages.length}</b> other pages (reports, dashboards, registers, approvals…).
        Search, then <b>Open →</b> to jump straight there.
      </div>
      {blockedCount > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-2.5 text-xs text-ink-muted">
          You're in <b className="text-ink">All branches</b> mode — <b className="text-ink">{blockedCount}</b> branch-operational
          pages are greyed out below. Focus a branch in the top selector to open them; Masters, HR admin, Settings and most
          Reports/Dashboards stay open from here.
        </div>
      )}

      <div className="grid gap-2">
        <div className="text-[13px] font-bold text-ink">Data-Creation Forms</div>
        <DataTable
          title={`Form Directory (${forms.length})`}
          columns={formCols}
          rows={forms}
          getRowKey={(r) => r.id}
          onRowClick={(r) => goToForm(r, setRoute, focus)}
          searchable
          searchPlaceholder="Search forms…"
          showDensityToggle={false}
          zebra
          emptyMessage="No forms found."
        />
      </div>

      <div className="grid gap-2">
        <div className="text-[13px] font-bold text-ink">Other Pages</div>
        <DataTable
          title={`Pages (${pages.length})`}
          columns={pageCols}
          rows={pages}
          getRowKey={(r) => r.id}
          onRowClick={(r) => goToForm(r, setRoute, focus)}
          searchable
          searchPlaceholder="Search pages…"
          showDensityToggle={false}
          zebra
          emptyMessage="No pages found."
        />
      </div>
    </div>
  );
}

export default FormsDirectory;
