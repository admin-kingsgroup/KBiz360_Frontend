/* ════════════════════════════════════════════════════════════════════
   PageLayout — the consistent page scaffold for every KBiz360 screen
   ════════════════════════════════════════════════════════════════════

   Enforces the enterprise page anatomy the whole app should share:

       Breadcrumb
       Page Title  ……………………  Primary Actions
       Filters
       ─────────────────────────────────────
       Content (table / form / grid)

   Usage:
     <PageLayout
       title="Trial Balance"
       subtitle="Live from the double-entry engine"
       actions={<button className="kbiz-btn-accent">Export</button>}
       filters={<PeriodBar … />}
     >
       <DataTable … />
     </PageLayout>

   Breadcrumbs are derived from the active route (core/routeMeta) unless an
   explicit `breadcrumbs` array of { label, href? } is passed.
   ──────────────────────────────────────────────────────────────────── */

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useNav } from '../core/ux/nav';
import { crumbsFor } from '../core/routeMeta';

export function Breadcrumb({ items }) {
  const nav = useNav();
  const crumbs = items && items.length ? items : crumbsFor(nav.route);
  if (!crumbs || crumbs.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className="mb-1 flex min-w-0 items-center gap-1 text-xs text-ink-muted">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <span key={i} className="inline-flex min-w-0 items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-ink-subtle" />}
            {c.href && !last ? (
              <button onClick={() => nav.navigate(c.href)} className="truncate font-medium text-[#185FA5] hover:underline">
                {c.label}
              </button>
            ) : (
              <span className={last ? 'truncate font-semibold text-navy' : 'truncate'}>{c.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export function PageLayout({
  title,
  subtitle,
  breadcrumbs,
  actions,
  filters,
  children,
  maxWidth = 'max-w-none',   // full-bleed: use the entire screen width (no sidebar)
  className = '',
}) {
  return (
    <div className={`w-full ${maxWidth} px-4 py-4 tablet:px-6 tablet:py-5 desktop:px-8 ${className}`}>
      <header className="mb-4">
        <Breadcrumb items={breadcrumbs} />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h1 className="truncate text-lg font-bold tracking-tight text-navy tablet:text-xl">{title}</h1>}
            {subtitle && <p className="mt-0.5 text-xs text-ink-muted tablet:text-sm">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {filters && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-brand border border-surface-border bg-surface px-3 py-2.5 shadow-sm">
            {filters}
          </div>
        )}
      </header>
      {children}
    </div>
  );
}

export default PageLayout;
