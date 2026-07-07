/* ════════════════════════════════════════════════════════════════════
   PageLayout — the premium, standard page scaffold for KBiz360 Pro
   ════════════════════════════════════════════════════════════════════

   Enforces the enterprise page anatomy every screen shares:

       Breadcrumb
       Page Title  ……………………………  Primary Actions
       ─ Filters ─────────────────────────────────────
       Content (table / form / grid)

   Composable sub-primitives are exported so screens can build custom
   headers without losing the shared rhythm:
       PageHeader · PageActions · PageFilters · SectionHeader · Breadcrumb

   Backwards compatible props (unchanged): title, subtitle, breadcrumbs,
   actions, filters, children, maxWidth, className.
   ──────────────────────────────────────────────────────────────────── */

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useNav } from '../core/ux/nav';
import { crumbsFor } from '../core/routeMeta';

const cn = (...xs) => xs.filter(Boolean).join(' ');

/* Route-derived (or explicit) breadcrumb trail. */
export function Breadcrumb({ items }) {
  const nav = useNav();
  const crumbs = items && items.length ? items : crumbsFor(nav.route);
  if (!crumbs || crumbs.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className="mb-1 flex min-w-0 items-center gap-1 text-[11.5px] text-ink-muted">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <span key={i} className="inline-flex min-w-0 items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-ink-subtle" />}
            {c.href && !last ? (
              <button onClick={() => nav.navigate(c.href)} className="truncate font-medium text-info transition-colors hover:underline">
                {c.label}
              </button>
            ) : (
              <span className={last ? 'truncate font-semibold text-ink' : 'truncate'}>{c.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

/* Right-aligned action cluster — wraps cleanly on small screens. */
export function PageActions({ className = '', children }) {
  if (!children) return null;
  return <div className={cn('flex flex-wrap items-center gap-2', className)}>{children}</div>;
}

/* Surface-framed filter bar. `scroll` keeps many inline controls on one
   horizontally-scrollable row instead of wrapping (page never overflows). */
export function PageFilters({ className = '', scroll = false, children }) {
  if (!children) return null;
  if (scroll) {
    return (
      <div className={cn('rounded-brand border border-surface-border bg-surface shadow-xs', className)}>
        <div className="flex items-center gap-2 overflow-x-auto px-3 py-2.5 [scrollbar-width:thin]">{children}</div>
      </div>
    );
  }
  return (
    <div className={cn('flex flex-wrap items-center gap-2 rounded-brand border border-surface-border bg-surface px-3 py-2.5 shadow-xs', className)}>
      {children}
    </div>
  );
}

/* Standard premium page header: breadcrumb · title/subtitle · actions. */
export function PageHeader({ title, subtitle, breadcrumbs, actions, className = '' }) {
  return (
    <header className={cn('mb-4 border-b border-surface-border pb-3', className)}>
      <Breadcrumb items={breadcrumbs} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {title && <h1 className="kbiz-page-title truncate">{title}</h1>}
          {subtitle && <p className="mt-0.5 text-[13px] text-ink-muted">{subtitle}</p>}
        </div>
        <PageActions>{actions}</PageActions>
      </div>
    </header>
  );
}

/* In-page section heading (groups content without a full card chrome). */
export function SectionHeader({ title, subtitle, actions, icon: Icon, className = '' }) {
  return (
    <div className={cn('mb-2.5 flex flex-wrap items-end justify-between gap-2', className)}>
      <div className="flex min-w-0 items-center gap-2">
        {Icon && <Icon size={16} className="shrink-0 text-ink-muted" />}
        <div className="min-w-0">
          {title && <h2 className="kbiz-section-title truncate">{title}</h2>}
          {subtitle && <p className="mt-0.5 text-[11.5px] text-ink-muted">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageLayout({
  title,
  subtitle,
  breadcrumbs,
  actions,
  filters,
  children,
  maxWidth = 'max-w-none',
  className = '',
}) {
  const hasHeader = title || subtitle || actions || (breadcrumbs && breadcrumbs.length);
  return (
    <div className={cn('mx-auto w-full px-4 py-4 tablet:px-6 tablet:py-5 desktop:px-8', maxWidth, className)}>
      {hasHeader && (
        <PageHeader title={title} subtitle={subtitle} breadcrumbs={breadcrumbs} actions={actions} className={filters ? 'mb-3' : 'mb-4'} />
      )}
      {filters && <PageFilters className="mb-4">{filters}</PageFilters>}
      {children}
    </div>
  );
}

export default PageLayout;
