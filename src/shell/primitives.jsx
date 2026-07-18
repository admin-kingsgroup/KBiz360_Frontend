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
import { X, Inbox, AlertTriangle, Loader2, Check } from 'lucide-react';
import { pushModal } from '../core/ux/modalStore';
import { useFocusTrap } from '../core/ux/focus';

export const cn = (...xs) => xs.filter(Boolean).join(' ');

/* ════════════════════════════════════════════════════════════════════
   Button — the one button. Variants + sizes, icon slot, loading state.
   ════════════════════════════════════════════════════════════════════ */

const BTN_VARIANT = {
  primary:   'bg-navy text-white shadow-sm hover:bg-navy-light disabled:bg-ink-muted',
  accent:    'bg-gold text-navy shadow-sm hover:bg-gold-dark hover:text-white disabled:opacity-50',
  secondary: 'bg-surface text-ink border border-surface-border hover:bg-surface-alt hover:border-ink/20 disabled:opacity-50',
  ghost:     'bg-transparent text-ink-muted hover:bg-ink/[0.06] hover:text-ink disabled:opacity-50',
  danger:    'bg-danger text-white shadow-sm hover:bg-danger/90 disabled:opacity-50',
  success:   'bg-success text-white shadow-sm hover:bg-success/90 disabled:opacity-50',
};

// Nominal (desktop) heights; sm/md bump to a 44px tap target below `tablet`.
const BTN_SIZE = {
  xs: 'h-7 px-2.5 text-[11px] gap-1 rounded-md',
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-md max-tablet:min-h-[44px]',
  md: 'h-9 px-4 text-[13px] gap-2 rounded-lg max-tablet:min-h-[44px]',
  lg: 'h-11 px-5 text-sm gap-2 rounded-lg',
};

// Dependency-free view-only read (the logged-in user + `viewOnly` flag are mirrored in
// localStorage by LoginScreen/App). Kept INLINE rather than imported from core/api so this
// low-level primitive — rendered by nearly every screen and test — never pulls core/api's
// `import.meta.env` into every component's (and test's) module graph. Mirrors core/api.isViewOnly.
export const VIEW_ONLY_REASON = 'View only — this account can review but cannot make changes.';
function isViewOnly() {
  try {
    const raw = (typeof localStorage !== 'undefined' && localStorage.getItem('kb360-user')) || 'null';
    const u = JSON.parse(raw);
    return !!(u && u.viewOnly);
  } catch { return false; }
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  block = false,
  write = false,
  className = '',
  children,
  type = 'button',
  disabled,
  title,
  ...rest
}) {
  const iconSize = size === 'xs' ? 13 : size === 'lg' ? 18 : 15;
  // Opt-in view-only gate: a WRITE button (create / edit / save / delete / approve / post …) is
  // pre-disabled with a reason for a view-only user — never a live button that only 403s on the
  // server ("disable with a reason, never a live no-op"). Non-write buttons (nav / filters / view)
  // are untouched, so this is fully backward-compatible: only `<Button write>` opts in.
  const voBlocked = write && isViewOnly();
  return (
    <button
      type={type}
      disabled={disabled || loading || voBlocked}
      title={voBlocked ? VIEW_ONLY_REASON : title}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center font-semibold whitespace-nowrap select-none',
        'transition-all duration-fast ease-premium active:scale-[0.98]',
        'focus:outline-none focus-visible:shadow-focus-ring',
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
      {/* Icon-only buttons in a loading state have no visible text — announce it. */}
      {loading && !children && <span className="sr-only">Loading…</span>}
      {!loading && IconRight && <IconRight size={iconSize} className="shrink-0" />}
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════════
   StatusPill / Badge — compact status chip in brand tones.
   ════════════════════════════════════════════════════════════════════ */

const PILL_TONE = {
  neutral: 'bg-surface-alt text-ink-muted ring-surface-border',
  info:    'bg-info-soft text-info ring-info/25',
  success: 'bg-success-soft text-success ring-success/25',
  warning: 'bg-warning-soft text-warning ring-warning/25',
  danger:  'bg-danger-soft text-danger ring-danger/25',
  gold:    'bg-gold-light/50 text-gold-dark ring-gold/30',
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
  // `min` → fluid auto-fit track (no breakpoints); else breakpoint preset.
  const style = min ? { gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}, 100%), 1fr))` } : undefined;
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
  const reactId = React.useId();
  const errorId = `${reactId}-err`;
  const hintId = `${reactId}-hint`;
  // Wire the message to the control so screen readers announce it, and flag the
  // control invalid when there's an error. We only augment a single element
  // child (the common case: one Input/Select/Textarea); fragments/arrays pass
  // through untouched.
  const describedBy = error ? errorId : hint ? hintId : undefined;
  const control = React.isValidElement(children) && describedBy
    ? React.cloneElement(children, {
        'aria-describedby': [children.props['aria-describedby'], describedBy].filter(Boolean).join(' '),
        'aria-invalid': error ? true : children.props['aria-invalid'],
        invalid: error ? true : children.props.invalid,
      })
    : children;
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
          {label}{required && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}
      {control}
      {error
        ? <p id={errorId} role="alert" className="text-[11px] font-medium text-danger">{error}</p>
        : hint && <p id={hintId} className="text-[11px] text-ink-subtle">{hint}</p>}
    </div>
  );
}

const CONTROL_BASE =
  'w-full rounded-md border bg-surface px-3 text-[13px] text-ink outline-none transition ' +
  'placeholder:text-ink-subtle focus:border-gold focus:shadow-gold-glow ' +
  'disabled:cursor-not-allowed disabled:bg-surface-alt disabled:text-ink-muted';
const controlHeight = 'h-9 max-tablet:min-h-[44px]';

// `invalid` drives both the red border AND `aria-invalid` so the error state is
// not signalled by colour alone. An explicit aria-invalid in `rest` wins.
export const Input = React.forwardRef(function Input({ invalid, className = '', ...rest }, ref) {
  return <input ref={ref} aria-invalid={invalid || undefined} className={cn(CONTROL_BASE, controlHeight, invalid ? 'border-danger' : 'border-surface-border', className)} {...rest} />;
});

export const Select = React.forwardRef(function Select({ invalid, className = '', children, ...rest }, ref) {
  return (
    <select ref={ref} aria-invalid={invalid || undefined} className={cn(CONTROL_BASE, controlHeight, 'pr-8', invalid ? 'border-danger' : 'border-surface-border', className)} {...rest}>
      {children}
    </select>
  );
});

export const Textarea = React.forwardRef(function Textarea({ invalid, className = '', rows = 3, ...rest }, ref) {
  return <textarea ref={ref} aria-invalid={invalid || undefined} rows={rows} className={cn(CONTROL_BASE, 'py-2 leading-relaxed', invalid ? 'border-danger' : 'border-surface-border', className)} {...rest} />;
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

export function LoadingState({ label = 'Loading…', className = '', lines = 4 }) {
  return (
    <div className={cn('px-4 py-6', className)} role="status" aria-label={label}>
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" style={{ opacity: Math.max(0.4, 1 - i * 0.15) }} />
        ))}
      </div>
      <span className="sr-only">{label}</span>
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
  const panelRef = React.useRef(null);
  const titleId = React.useId();
  React.useEffect(() => {
    if (!open) return undefined;
    const pop = pushModal(onClose || (() => {}));
    return () => pop();
  }, [open, onClose]);
  // Move focus into the drawer on open, trap Tab inside it, and restore focus
  // to the opener on close. Esc is handled by the modal stack (pushModal) above.
  useFocusTrap(panelRef, { active: open });

  if (!open) return null;
  const sideCls = side === 'left'
    ? 'left-0 max-tablet:translate-x-0'
    : 'right-0 max-tablet:translate-x-0';

  return createPortal(
    <div className="noprint fixed inset-0 z-[9000] flex" role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined}>
      <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <aside
        ref={panelRef}
        className={cn(
          'absolute inset-y-0 flex w-full max-w-full flex-col bg-surface shadow-brand-lg',
          DRAWER_WIDTH[width] || DRAWER_WIDTH.md,
          sideCls,
        )}
      >
        <div className="flex items-start gap-3 border-b border-surface-border px-4 py-3">
          <div className="min-w-0 flex-1">
            {title && <h2 id={titleId} className="truncate text-sm font-bold text-navy">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-all duration-fast ease-premium hover:bg-ink/[0.06] hover:text-ink focus:outline-none focus-visible:shadow-focus-ring max-desktop:h-11 max-desktop:w-11"
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

/* ════════════════════════════════════════════════════════════════════
   IconButton — square, touch-friendly icon action.
   ════════════════════════════════════════════════════════════════════ */
const ICONBTN_SIZE = { sm: 'h-8 w-8', md: 'h-9 w-9 max-tablet:h-11 max-tablet:w-11', lg: 'h-11 w-11' };
const ICONBTN_VARIANT = {
  ghost:  'text-ink-muted hover:bg-ink/[0.06] hover:text-ink',
  solid:  'bg-navy text-white hover:bg-navy-light',
  subtle: 'bg-surface-alt text-ink-muted hover:bg-surface-border hover:text-ink',
};
export function IconButton({ icon: Icon, label, size = 'md', variant = 'ghost', className = '', ...rest }) {
  return (
    <button
      type="button" aria-label={label} title={label}
      className={cn('inline-flex shrink-0 items-center justify-center rounded-[8px] transition-all duration-fast ease-premium active:scale-[0.94] focus:outline-none focus-visible:shadow-focus-ring',
        ICONBTN_SIZE[size] || ICONBTN_SIZE.md, ICONBTN_VARIANT[variant] || ICONBTN_VARIANT.ghost, className)}
      {...rest}
    >
      {Icon && <Icon size={size === 'lg' ? 20 : 17} />}
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Checkbox / Switch — accessible, branded toggles.
   ════════════════════════════════════════════════════════════════════ */
export function Checkbox({ checked, onChange, label, disabled, className = '' }) {
  return (
    <label className={cn('inline-flex select-none items-center gap-2 text-[13px] text-ink max-tablet:min-h-[44px]', disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer', className)}>
      <input type="checkbox" className="peer sr-only" checked={!!checked} disabled={disabled} onChange={(e) => onChange && onChange(e.target.checked)} />
      <span className={cn('flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors duration-fast peer-focus-visible:ring-2 peer-focus-visible:ring-info/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface', checked ? 'border-navy bg-navy text-white' : 'border-surface-border bg-surface')}>
        {checked && <Check size={13} strokeWidth={3} />}
      </span>
      {label && <span>{label}</span>}
    </label>
  );
}

export function Switch({ checked, onChange, label, disabled, className = '' }) {
  return (
    <label className={cn('inline-flex select-none items-center gap-2 text-[13px] text-ink', disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer', className)}>
      {/* Hit target ≥44px on mobile; the visible track stays compact and shows focus. */}
      <button
        type="button" role="switch" aria-checked={!!checked} aria-label={label || 'Toggle'} disabled={disabled}
        onClick={() => !disabled && onChange && onChange(!checked)}
        className="group/sw inline-flex shrink-0 items-center justify-center rounded-full bg-transparent focus:outline-none max-tablet:min-h-[44px] max-tablet:min-w-[44px]"
      >
        <span className={cn('relative h-[22px] w-[38px] rounded-full transition-colors duration-fast ease-premium',
          'group-focus-visible/sw:ring-2 group-focus-visible/sw:ring-info/50 group-focus-visible/sw:ring-offset-2 group-focus-visible/sw:ring-offset-surface',
          checked ? 'bg-success' : 'bg-surface-border')}>
          <span className={cn('absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow transition-[left] duration-fast ease-premium', checked ? 'left-[18px]' : 'left-0.5')} />
        </span>
      </button>
      {label && <span>{label}</span>}
    </label>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Card — plain elevated surface (Panel = PageSection with header).
   ════════════════════════════════════════════════════════════════════ */
export function Card({ className = '', children, ...rest }) {
  return <div className={cn('rounded-brand border border-surface-border bg-surface p-4 shadow-card', className)} {...rest}>{children}</div>;
}
export const Panel = PageSection;

/* ════════════════════════════════════════════════════════════════════
   Skeleton loaders — shimmer that matches final layout shape.
   ════════════════════════════════════════════════════════════════════ */
export function Skeleton({ className = '', style }) {
  return <div className={cn('kb-skeleton', className)} style={style} aria-hidden="true" />;
}
export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={cn('flex flex-col gap-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => <Skeleton key={i} className="h-3" style={{ width: i === lines - 1 ? '70%' : '100%' }} />)}
    </div>
  );
}
export function SkeletonTable({ rows = 6, cols = 4, className = '' }) {
  return (
    <div className={cn('overflow-hidden rounded-brand border border-surface-border bg-surface shadow-card', className)} aria-hidden="true">
      <div className="flex gap-3 border-b border-surface-border bg-surface-alt px-3.5 py-3">
        {Array.from({ length: cols }).map((_, i) => <Skeleton key={i} className="h-3 flex-1" />)}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3 border-b border-surface-border px-3.5 py-3 last:border-0">
          {Array.from({ length: cols }).map((_, c) => <Skeleton key={c} className="h-3 flex-1" style={{ opacity: Math.max(0.35, 1 - r * 0.09) }} />)}
        </div>
      ))}
    </div>
  );
}
export function SkeletonCards({ count = 4, min = '200px', className = '' }) {
  return (
    <ResponsiveGrid min={min} gap="md" className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-brand border border-surface-border bg-surface p-4 shadow-card">
          <Skeleton className="mb-2 h-2.5 w-1/2" /><Skeleton className="mb-1.5 h-6 w-2/3" /><Skeleton className="h-2.5 w-1/3" />
        </div>
      ))}
    </ResponsiveGrid>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Tooltip — lightweight CSS hover tooltip (no portal, no deps).
   ════════════════════════════════════════════════════════════════════ */
const TT_POS = {
  top:    'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
  left:   'right-full top-1/2 -translate-y-1/2 mr-1.5',
  right:  'left-full top-1/2 -translate-y-1/2 ml-1.5',
};
export function Tooltip({ label, side = 'top', className = '', children }) {
  if (!label) return children;
  return (
    <span className={cn('group/tt relative inline-flex', className)}>
      {children}
      <span role="tooltip" className={cn('pointer-events-none absolute z-[9999] whitespace-nowrap rounded-md bg-navy px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-pop transition-opacity duration-fast ease-premium group-hover/tt:opacity-100', TT_POS[side] || TT_POS.top)}>
        {label}
      </span>
    </span>
  );
}

export { Modal } from '../core/ux/Modal';
export { Menu } from '../core/ux/Menu';
export { Combobox } from '../core/ux/Combobox';

export default {
  Button, IconButton, StatusPill, Badge, PageSection, Panel, Card, ResponsiveGrid,
  Toolbar, FilterBar, FormField, Input, Select, Textarea, Checkbox, Switch,
  EmptyState, ErrorState, LoadingState, Skeleton, SkeletonText, SkeletonTable, SkeletonCards,
  Tooltip, Drawer,
};
