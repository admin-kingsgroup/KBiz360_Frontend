/* ════════════════════════════════════════════════════════════════════
   primitives — shared, responsive UI building blocks for KBiz360
   ════════════════════════════════════════════════════════════════════

   Tailwind-only, brand-token-driven primitives that every screen can share.
   They own NO business data and make NO API calls — they are presentational.

   Why this file exists
   ────────────────────
   The app has thousands of bespoke inline styles, hard pixel widths and raw
   layout in its feature modules. These primitives give screens a single, small
   vocabulary to migrate onto, so pages become consistent and responsive without
   rewriting any business logic:

       Button        StatusPill / Badge      EmptyState / LoadingState
       PageSection   ResponsiveGrid          Toolbar / FilterBar
       FormField     Input / Select / Textarea
       Drawer        (Modal is re-exported from core/ux)

   Design rules
   ────────────
   • Mobile-first. Breakpoints are the app's own `tablet` (768) / `desktop` (1024).
   • Touch targets ≥ 44px on mobile (max-tablet:min-h-[44px]); denser on desktop.
   • ERP density — compact, not marketing-site airy.
   • Brand tokens only: navy, gold, surface, ink, success/warning/danger.
   • Additive: importing these changes nothing until a screen opts in.
   ──────────────────────────────────────────────────────────────────── */

import React from 'react';
import { createPortal } from 'react-dom';
import { X, Inbox, AlertTriangle, Loader2 } from 'lucide-react';
import { pushModal } from '../core/ux/modalStore';

export const cn = (...xs) => xs.filter(Boolean).join(' ');

/* ════════════════════════════════════════════════════════════════════
   Button — the one button. Variants + sizes, icon slot, loading state.
   ════════════════════════════════════════════════════════════════════ */

const BTN_VARIANT = {
  primary: 'bg-navy text-gold border border-transparent hover:bg-navy-light disabled:bg-ink-muted',
  accent:  'bg-gold text-navy border border-transparent hover:bg-gold-dark hover:text-white disabled:opacity-50',
  secondary: 'bg-surface text-navy border border-surface-border hover:bg-surface-alt hover:border-navy/20 disabled:opacity-50',
  ghost:   'bg-transparent text-ink-muted border border-transparent hover:bg-navy/5 hover:text-navy disabled:opacity-50',
  danger:  'bg-danger text-white border border-transparent hover:bg-danger/90 disabled:opacity-50',
  success: 'bg-[#1D6F42] text-white border border-transparent hover:bg-[#17592f] disabled:opacity-50',
};

// Nominal (desktop) heights; sm/md bump to a 44px tap target below `tablet`.
const BTN_SIZE = {
  xs: 'h-7 px-2.5 text-[11px] gap-1 rounded-md',
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-md max-tablet:min-h-[44px]',
  md: 'h-9 px-4 text-[13px] gap-2 rounded-lg max-tablet:min-h-[44px]',
  lg: 'h-11 px-5 text-sm gap-2 rounded-lg',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  block = false,
  className = '',
  children,
  type = 'button',
  disabled,
  ...rest
}) {
  const iconSize = size === 'xs' ? 13 : size === 'lg' ? 18 : 15;
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold whitespace-nowrap select-none transition',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50',
        'disabled:cursor-not-allowed',
        BTN_VARIANT[variant] || BTN_VARIANT.secondary,
        BTN_SIZE[size] || BTN_SIZE.md,
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading
        ? <Loader2 size={iconSize} className="animate-spin" />
        : Icon && <Icon size={iconSize} className="shrink-0" />}
      {children && <span className="truncate">{children}</span>}
      {!loading && IconRight && <IconRight size={iconSize} className="shrink-0" />}
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════════
   StatusPill / Badge — compact status chip in brand tones.
   ════════════════════════════════════════════════════════════════════ */

const PILL_TONE = {
  neutral: 'bg-surface-alt text-ink-muted ring-surface-border',
  info:    'bg-[#E6F1FB] text-[#185FA5] ring-[#B5D4F4]',
  success: 'bg-[#EAF3DE] text-[#3B6D11] ring-[#C0DD97]',
  warning: 'bg-[#FAEEDA] text-[#854F0B] ring-[#FAC775]',
  danger:  'bg-[#FCEBEB] text-[#A32D2D] ring-[#F7C1C1]',
  gold:    'bg-gold-light/40 text-gold-dark ring-gold/40',
  navy:    'bg-navy/5 text-navy ring-navy/15',
};

export function StatusPill({ tone = 'neutral', size = 'md', dot = false, icon: Icon, className = '', children }) {
  const sz = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]';
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full font-semibold ring-1 ring-inset whitespace-nowrap',
      sz, PILL_TONE[tone] || PILL_TONE.neutral, className,
    )}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {Icon && <Icon size={size === 'sm' ? 10 : 12} />}
      {children}
    </span>
  );
}
export const Badge = StatusPill;

/* ════════════════════════════════════════════════════════════════════
   PageSection — a titled card region inside a page (sub-section of content).
   ════════════════════════════════════════════════════════════════════ */

export function PageSection({
  title,
  subtitle,
  actions,
  icon: Icon,
  padded = true,
  className = '',
  bodyClassName = '',
  children,
}) {
  const hasHeader = title || subtitle || actions;
  return (
    <section className={cn('rounded-brand border border-surface-border bg-surface shadow-sm', className)}>
      {hasHeader && (
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-surface-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            {Icon && <Icon size={16} className="shrink-0 text-ink-muted" />}
            <div className="min-w-0">
              {title && <h3 className="truncate text-sm font-bold text-navy">{title}</h3>}
              {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn(padded && 'p-4', bodyClassName)}>{children}</div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════
   ResponsiveGrid — 1 col on mobile, more as the viewport grows.
   Use `cols` for breakpoint presets, or `min` for an auto-fill track.
   ════════════════════════════════════════════════════════════════════ */

const GRID_COLS = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 tablet:grid-cols-2',
  3: 'grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3',
  4: 'grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-4',
  5: 'grid-cols-2 tablet:grid-cols-3 desktop:grid-cols-5',
  6: 'grid-cols-2 tablet:grid-cols-3 desktop:grid-cols-6',
};
const GRID_GAP = { none: 'gap-0', sm: 'gap-2', md: 'gap-3', lg: 'gap-4' };

export function ResponsiveGrid({ cols = 3, min, gap = 'md', className = '', children, ...rest }) {
  // `min` → fluid auto-fill track (no breakpoints); else breakpoint preset.
  const style = min ? { gridTemplateColumns: `repeat(auto-fill, minmax(min(${min}, 100%), 1fr))` } : undefined;
  return (
    <div
      className={cn('grid', !min && (GRID_COLS[cols] || GRID_COLS[3]), GRID_GAP[gap] || GRID_GAP.md, className)}
      style={style}
      {...rest}
    >
      {children}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Toolbar — a wrapping action row. Children flow left; `right` slot pins
   to the end. Wraps cleanly on small screens instead of clipping.
   ════════════════════════════════════════════════════════════════════ */

export function Toolbar({ right, className = '', children }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div>
      {right && <div className="ml-auto flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   FilterBar — a surface-framed row of filter controls. Wraps on mobile;
   each child should size itself (use FormField/Input with their own widths).
   ════════════════════════════════════════════════════════════════════ */

export function FilterBar({ className = '', children, scroll = false }) {
  if (scroll) {
    // Horizontal scroll variant for many inline controls on narrow screens.
    return (
      <div className={cn('rounded-brand border border-surface-border bg-surface shadow-sm', className)}>
        <div className="flex items-center gap-2 overflow-x-auto px-3 py-2.5 [scrollbar-width:thin]">{children}</div>
      </div>
    );
  }
  return (
    <div className={cn('flex flex-wrap items-center gap-2 rounded-brand border border-surface-border bg-surface px-3 py-2.5 shadow-sm', className)}>
      {children}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   FormField + controls — label, control, hint/error. Validation-aware.
   ════════════════════════════════════════════════════════════════════ */

export function FormField({ label, htmlFor, required, hint, error, className = '', children }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-muted">
          {label}{required && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}
      {children}
      {error
        ? <p className="text-[11px] font-medium text-danger">{error}</p>
        : hint && <p className="text-[11px] text-ink-subtle">{hint}</p>}
    </div>
  );
}

const CONTROL_BASE =
  'w-full rounded-md border bg-surface px-3 text-[13px] text-ink outline-none transition ' +
  'placeholder:text-ink-subtle focus:border-gold focus:shadow-gold-glow ' +
  'disabled:cursor-not-allowed disabled:bg-surface-alt disabled:text-ink-muted';
const controlHeight = 'h-9 max-tablet:min-h-[44px]';

export const Input = React.forwardRef(function Input({ invalid, className = '', ...rest }, ref) {
  return <input ref={ref} className={cn(CONTROL_BASE, controlHeight, invalid ? 'border-danger' : 'border-surface-border', className)} {...rest} />;
});

export const Select = React.forwardRef(function Select({ invalid, className = '', children, ...rest }, ref) {
  return (
    <select ref={ref} className={cn(CONTROL_BASE, controlHeight, 'pr-8', invalid ? 'border-danger' : 'border-surface-border', className)} {...rest}>
      {children}
    </select>
  );
});

export const Textarea = React.forwardRef(function Textarea({ invalid, className = '', rows = 3, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} className={cn(CONTROL_BASE, 'py-2 leading-relaxed', invalid ? 'border-danger' : 'border-surface-border', className)} {...rest} />;
});

/* ════════════════════════════════════════════════════════════════════
   EmptyState / LoadingState — first-class non-data states.
   ════════════════════════════════════════════════════════════════════ */

export function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', hint, action, className = '' }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-4 py-12 text-center', className)}>
      <Icon className="mb-2 h-8 w-8 text-ink-subtle" />
      <p className="text-sm font-medium text-ink-muted">{title}</p>
      {hint && <p className="mt-1 max-w-md text-xs text-ink-subtle">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', message, onRetry, className = '' }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-4 py-12 text-center', className)}>
      <AlertTriangle className="mb-2 h-8 w-8 text-danger" />
      <p className="text-sm font-semibold text-danger">{title}</p>
      {message && <p className="mt-1 max-w-md text-xs text-ink-muted">{message}</p>}
      {onRetry && <Button variant="primary" size="sm" className="mt-3" onClick={onRetry}>Retry</Button>}
    </div>
  );
}

export function LoadingState({ label = 'Loading…', className = '' }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-4 py-12 text-center', className)}>
      <Loader2 className="h-7 w-7 animate-spin text-gold" />
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Drawer — right-side slide-over. Full-width on mobile, fixed on desktop.
   Closes on backdrop click and Esc (via the shared modal stack). Body
   scrolls internally; header + optional footer stay pinned.
   ════════════════════════════════════════════════════════════════════ */

const DRAWER_WIDTH = {
  sm: 'desktop:w-[360px]',
  md: 'desktop:w-[480px]',
  lg: 'desktop:w-[640px]',
  xl: 'desktop:w-[820px]',
};

export function Drawer({ open = true, onClose, title, subtitle, footer, width = 'md', side = 'right', children }) {
  React.useEffect(() => {
    if (!open) return undefined;
    const pop = pushModal(onClose || (() => {}));
    return () => pop();
  }, [open, onClose]);

  if (!open) return null;
  const sideCls = side === 'left'
    ? 'left-0 max-tablet:translate-x-0'
    : 'right-0 max-tablet:translate-x-0';

  return createPortal(
    <div className="noprint fixed inset-0 z-[9000] flex" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <aside
        className={cn(
          'absolute inset-y-0 flex w-full max-w-full flex-col bg-surface shadow-brand-lg',
          DRAWER_WIDTH[width] || DRAWER_WIDTH.md,
          sideCls,
        )}
      >
        <div className="flex items-start gap-3 border-b border-surface-border px-4 py-3">
          <div className="min-w-0 flex-1">
            {title && <h2 className="truncate text-sm font-bold text-navy">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-muted transition hover:bg-navy/5"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-surface-border bg-surface-alt px-4 py-3">
            {footer}
          </div>
        )}
      </aside>
    </div>,
    document.body,
  );
}

export { Modal } from '../core/ux/Modal';

export default {
  Button, StatusPill, Badge, PageSection, ResponsiveGrid, Toolbar, FilterBar,
  FormField, Input, Select, Textarea, EmptyState, ErrorState, LoadingState, Drawer,
};
