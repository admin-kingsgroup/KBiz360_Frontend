/* ════════════════════════════════════════════════════════════════════
   AppShell — premium SaaS top-navigation shell (Linear / Stripe / Vercel feel)
   ════════════════════════════════════════════════════════════════════

   NO sidebar. A single sticky, blurred app-bar holds everything:

     ┌──────────────────────────────────────────────────────────────────┐
     │ logo   Dashboard  Finance  Reports … ▾      ⌕   🔔  FY  🏢  👤      │  ← sticky + backdrop-blur
     └──────────────────────────────────────────────────────────────────┘
       (each module with sub-items opens a multi-column mega-menu panel)

   • Desktop (≥1024): horizontal nav; hover/focus/click opens a premium
     mega-menu dropdown (rounded, soft shadow, subtle border).
   • Mobile/tablet (<1024): hamburger → right slide-over with search,
     company + FY selectors, and an accordion of the full menu.
   • Content area is FULL WIDTH (no sidebar gutter).

   Menu data comes from the app's real getMenu() so every link routes to a
   working screen (this is a travel ERP, not a generic stock ERP).
   ──────────────────────────────────────────────────────────────────── */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Menu, X, ChevronDown, Bell, Printer, Eye } from 'lucide-react';
import { KBIZ_LOGO } from '../core/brand';
import { getMenu } from '../core/menus';
import { useNotifRefresh } from '../core/hooks';
import { getUnreadCount } from '../core/business-logic';
import { openPrintPreview } from '../core/PrintPreview';
import { useFyStore, FY_OPTIONS } from '../store/fy';
import { ModuleSearch } from './ModuleSearch';
import { BranchSwitcher } from './BranchSwitcher';
import { NotifPanel } from './NotifPanel';
import { UserMenu } from './UserMenu';

const cn = (...xs) => xs.filter(Boolean).join(' ');

/* Does this node (or any descendant) point at the active route? */
function containsRoute(node, route) {
  if (!node) return false;
  if (node.href) return node.href === route;
  if (node.children) return node.children.some((c) => containsRoute(c, route));
  return false;
}

/* Split a section's children into mega-menu columns: each nested group is its
   own titled column; consecutive leaves / divider-led runs form columns. */
function buildColumns(children = []) {
  const cols = [];
  let loose = null;
  const flush = () => { if (loose) { cols.push(loose); loose = null; } };
  for (const c of children) {
    if (!c) continue;
    if (c.divider) { flush(); loose = { title: c.label, items: [] }; continue; }
    if (c.children) { flush(); cols.push({ title: c.label, items: c.children }); continue; }
    if (!loose) loose = { title: null, items: [] };
    loose.items.push(c);
  }
  flush();
  return cols;
}

/* A single leaf link inside a mega-menu / accordion. */
function Leaf({ node, route, go }) {
  if (!node) return null;
  if (node.divider) {
    return <div className="px-2.5 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-ink-subtle">{node.label}</div>;
  }
  if (node.children) {
    return (
      <div className="pt-1">
        <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-ink-subtle">{node.label}</div>
        <div className="space-y-0.5">{node.children.map((c, i) => <Leaf key={i} node={c} route={route} go={go} />)}</div>
      </div>
    );
  }
  const active = route === node.href;
  return (
    <button
      type="button"
      onClick={() => go(node.href)}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group/leaf flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50',
        active ? 'bg-navy/5 font-semibold text-navy' : 'font-medium text-ink-muted hover:bg-navy/5 hover:text-navy',
      )}
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full transition', active ? 'bg-gold' : 'bg-transparent group-hover/leaf:bg-gold/60')} />
      <span className="truncate">{node.label}</span>
    </button>
  );
}

/* A prominent top-level quick action — a section's title-less leaf (e.g. "Dashboard
   Accountant", "Approve & Post"). Rendered as a pill in a featured row above the
   grouped columns, rather than floating in an empty-headed column of its own. */
function FeaturedAction({ node, route, go }) {
  if (!node || node.divider) return null;
  const active = route === node.href;
  return (
    <button
      type="button"
      onClick={() => go(node.href)}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group/fa inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-[13px] font-semibold transition',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50',
        active
          ? 'border-navy/15 bg-navy/5 text-navy'
          : 'border-surface-border bg-surface-alt text-ink-muted hover:border-navy/15 hover:bg-navy/5 hover:text-navy',
      )}
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full transition', active ? 'bg-gold' : 'bg-gold/40 group-hover/fa:bg-gold')} />
      <span className="whitespace-nowrap">{node.label}</span>
    </button>
  );
}

/* Premium multi-column dropdown panel — PORTALED to <body> so it floats above all
   page content. The app-bar sets its own stacking + backdrop-blur context, which
   would otherwise trap an in-header dropdown beneath higher-z page elements. It is
   positioned (fixed) under its trigger via the measured anchor rect.

   Layout: title-less leaves become a featured action row; the remaining titled
   groups flow into a BALANCED CSS-column masonry (each group is break-inside-avoid)
   so uneven group heights pack tightly instead of leaving ragged grid-row gaps. */
function MegaPanel({ item, route, go, align, anchor, onEnter, onLeave }) {
  if (!anchor) return null;
  const cols = buildColumns(item.children);

  // Split orphan quick-action leaves from the grouped (titled) columns.
  const featured = [];
  const groups = [];
  for (const c of cols) {
    if (c.title) groups.push(c);
    else featured.push(...c.items);
  }

  // Balanced, contained sizing. Pick a column count from the group count, capped at
  // 5 and by what the viewport can actually fit, then derive a fixed panel width.
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const COL_W = 220, COL_GAP = 24, PAD = 16;
  const fitCols = Math.max(1, Math.floor((vw - 16 - 2 * PAD + COL_GAP) / (COL_W + COL_GAP)));
  const colCount = Math.max(1, Math.min(groups.length || 1, 5, fitCols));
  const panelW = Math.min(colCount * COL_W + (colCount - 1) * COL_GAP + 2 * PAD, vw - 16);

  // Anchor under the trigger (right-edge for right-aligned items), then clamp fully
  // on-screen so a wide panel near the viewport edge never overflows.
  let left = align === 'right' ? anchor.right - panelW : anchor.left;
  left = Math.max(8, Math.min(left, vw - panelW - 8));
  const style = { position: 'fixed', top: anchor.bottom, left, zIndex: 99999, paddingTop: 8 };

  return createPortal(
    <div role="menu" data-mega-menu style={style} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <div
        className="animate-kb-pop rounded-2xl border border-surface-border bg-surface/95 p-4 shadow-pop backdrop-blur-xl"
        style={{ width: panelW, maxHeight: '74vh', overflowY: 'auto' }}
      >
        {featured.length > 0 && (
          <div className="mb-3.5 flex flex-wrap gap-2 border-b border-surface-border pb-3.5">
            {featured.map((node, i) => <FeaturedAction key={i} node={node} route={route} go={go} />)}
          </div>
        )}
        {groups.length > 0 && (
          <div style={{ columnCount: colCount, columnGap: COL_GAP }}>
            {groups.map((col, ci) => (
              <div key={ci} className="mb-4" style={{ breakInside: 'avoid' }}>
                <div className="mb-1.5 border-b border-surface-border px-2.5 pb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-ink-subtle">
                  {col.title}
                </div>
                <div className="space-y-0.5">
                  {col.items.map((c, i) => <Leaf key={i} node={c} route={route} go={go} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* Horizontal desktop nav with hover/click mega-menus. The open panel is portaled to
   <body> (see MegaPanel), so a short close-delay bridges the gap between the nav and
   the now-detached panel — hovering onto the panel must not dismiss it. */
// Shorter labels for the horizontal nav pills only (the mega-panel keeps its full title).
// Keeps the 8-pill bar from overflowing on laptops — "Taxation — GST" is the long one.
const NAV_SHORT_LABEL = { 'Taxation — GST': 'Taxation', 'Taxation — VAT': 'Taxation' };

function DesktopNav({ menu, route, go }) {
  const [open, setOpen] = useState(null);
  const [anchor, setAnchor] = useState(null);
  const ref = useRef(null);
  const timer = useRef(null);
  const cancelClose = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  const scheduleClose = () => { cancelClose(); timer.current = setTimeout(() => setOpen(null), 140); };
  const openAt = (i, el) => { cancelClose(); setOpen(i); if (el) setAnchor(el.getBoundingClientRect()); };
  const closeNow = () => { cancelClose(); setOpen(null); };

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closeNow(); };
    const onDoc = (e) => {
      if (ref.current && ref.current.contains(e.target)) return;
      if (e.target.closest && e.target.closest('[data-mega-menu]')) return; // clicks inside the portaled panel
      closeNow();
    };
    const onReflow = () => closeNow(); // a moved trigger would mis-place the panel → just close
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('resize', onReflow);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('resize', onReflow);
    };
  }, []);

  const goClose = (href) => { closeNow(); go(href); };
  const openItem = open != null ? menu[open] : null;
  const openAlign = open != null && open >= menu.length - 2 ? 'right' : 'left'; // keep right-most panels on-screen

  return (
    <nav ref={ref} aria-label="Primary" className="hidden min-w-0 items-center gap-0.5 desktop:flex" onMouseLeave={scheduleClose}>
      {menu.map((item, i) => {
        const hasChildren = !!item.children;
        const active = hasChildren ? containsRoute(item, route) : route === item.href;
        const isOpen = open === i;
        return (
          <div key={i} className="relative" onMouseEnter={(e) => hasChildren && openAt(i, e.currentTarget)}>
            <button
              type="button"
              onClick={(e) => (hasChildren ? (isOpen ? closeNow() : openAt(i, e.currentTarget.parentElement)) : go(item.href))}
              aria-haspopup={hasChildren ? 'true' : undefined}
              aria-expanded={hasChildren ? isOpen : undefined}
              className={cn(
                // Compact on laptops (desktop ≤ width < 2xl) so the whole 8-item nav + the
                // right cluster fit; full size only from 2xl (1536px) up. Prevents the nav
                // overflowing behind the right-hand controls on 1024–1535px screens
                // (e.g. a 1512px MacBook where "Masters"/"Admin" were getting clipped).
                'flex items-center gap-0.5 rounded-lg px-2 py-2 text-[12px] font-medium transition-all duration-fast ease-premium',
                '2xl:gap-1 2xl:px-3 2xl:text-[13.5px]',
                'focus:outline-none focus-visible:shadow-focus-ring',
                active || isOpen ? 'bg-ink/[0.05] text-navy' : 'text-ink-muted hover:bg-ink/[0.04] hover:text-navy',
              )}
            >
              <span className="whitespace-nowrap">{NAV_SHORT_LABEL[item.label] || item.label}</span>
              {hasChildren && <ChevronDown size={13} className={cn('shrink-0 transition-transform', isOpen && 'rotate-180')} />}
              {/* active underline pill */}
              <span className={cn('absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gold transition-opacity 2xl:inset-x-3', active ? 'opacity-100' : 'opacity-0')} />
            </button>
          </div>
        );
      })}
      {openItem && openItem.children && (
        <MegaPanel item={openItem} route={route} go={goClose} align={openAlign} anchor={anchor}
          onEnter={cancelClose} onLeave={scheduleClose} />
      )}
    </nav>
  );
}

/* Mobile accordion node. */
function MobileNode({ node, route, go, depth = 0 }) {
  const [open, setOpen] = useState(() => containsRoute(node, route));
  if (!node) return null;
  if (node.divider) return <div className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-ink-subtle">{node.label}</div>;
  if (!node.children) {
    const active = route === node.href;
    return (
      <button
        type="button"
        onClick={() => go(node.href)}
        style={{ paddingLeft: 12 + depth * 14 }}
        className={cn('flex min-h-[44px] w-full items-center rounded-lg py-2.5 pr-3 text-left text-sm transition-colors duration-fast',
          active ? 'bg-navy/5 font-semibold text-navy' : 'font-medium text-ink-muted hover:bg-navy/5 hover:text-navy')}
      >
        {node.label}
      </button>
    );
  }
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ paddingLeft: 12 + depth * 14 }}
        aria-expanded={open}
        className="flex min-h-[44px] w-full items-center justify-between rounded-lg py-2.5 pr-3 text-left text-sm font-semibold text-navy transition-colors duration-fast hover:bg-navy/5"
      >
        <span className="flex items-center gap-2">{node.icon && <node.icon size={16} className="text-ink-muted" />}{node.label}</span>
        <ChevronDown size={15} className={cn('text-ink-subtle transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="mb-1">{node.children.map((c, i) => <MobileNode key={i} node={c} route={route} go={go} depth={depth + 1} />)}</div>}
    </div>
  );
}

function FySelector() {
  const fy = useFyStore((s) => s.fy);
  const setFy = useFyStore((s) => s.setFy);
  return (
    <label className="flex items-center gap-1.5 rounded-lg border border-surface-border bg-surface/70 px-2.5 py-1.5 transition-colors hover:border-ink/20 max-desktop:min-h-[44px] max-desktop:flex-1">
      <span className="text-[9px] font-bold uppercase tracking-wide text-ink-subtle">FY</span>
      <select
        value={fy.startYear}
        onChange={(e) => setFy(Number(e.target.value))}
        aria-label="Financial year"
        className="w-full bg-transparent text-xs font-semibold text-ink outline-none"
      >
        {FY_OPTIONS.map((o) => <option key={o.startYear} value={o.startYear}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function AppShell({ branch, setBranch, route, setRoute, currentUser, setCurrentUser, subBar, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  useNotifRefresh();
  const unread = getUnreadCount();
  const menu = useMemo(() => getMenu(branch, currentUser), [branch, currentUser]);
  const go = (href) => { if (href) setRoute(href); setMobileOpen(false); };

  // Close the mobile slide-over once we cross into desktop.
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 1024) setMobileOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface-alt">
      {/* ── Sticky, blurred app-bar ──────────────────────────────────── */}
      <header className="noprint sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b border-surface-border bg-surface/80 px-3 backdrop-blur-xl transition-shadow tablet:px-5 shadow-[0_1px_0_rgba(16,18,22,0.04),0_6px_20px_-16px_rgba(16,18,22,0.16)]">
        {/* Logo */}
        <button type="button" onClick={() => go('/dashboard')} aria-label="Go to dashboard" className="flex shrink-0 items-center justify-center gap-2 rounded-lg pr-1 transition-colors duration-fast hover:bg-ink/[0.04] focus:outline-none focus-visible:shadow-focus-ring max-desktop:min-h-[44px] max-desktop:min-w-[44px]">
          <img src={KBIZ_LOGO} alt="KBiz360" className="h-8 w-8 rounded-lg object-contain" />
          <span className="hidden text-[15px] font-extrabold tracking-tight text-ink tablet:block">KBiz<span className="text-gold">360</span></span>
        </button>

        <span className="mx-1 hidden h-6 w-px bg-surface-border desktop:block" />

        {/* Desktop horizontal nav + mega menus */}
        <DesktopNav menu={menu} route={route} go={go} />

        <div className="flex-1" />

        {/* Right cluster — tighten the gap on laptops so the items fit */}
        <div className="flex shrink-0 items-center gap-1 2xl:gap-1.5">
          <div className="hidden w-40 desktop:block 2xl:w-64"><ModuleSearch branch={branch} currentUser={currentUser} setRoute={setRoute} /></div>

          <button
            type="button"
            title="Print / Save as PDF"
            onClick={() => openPrintPreview({ selector: 'main', title: 'Document', recommend: 'portrait' })}
            // Secondary action — shown only from `wide` (1400px) up, where the header has
            // room for it without clipping the nav (pages also have their own Export/Print).
            className="hidden h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-all duration-fast ease-premium hover:bg-ink/[0.06] hover:text-ink wide:flex"
          >
            <Printer size={18} />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotif((s) => !s)}
              aria-label="Notifications"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-all duration-fast ease-premium hover:bg-ink/[0.06] hover:text-ink focus:outline-none focus-visible:shadow-focus-ring max-desktop:h-11 max-desktop:w-11"
            >
              <Bell size={18} />
            </button>
            {unread > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full border-2 border-white bg-danger px-1 text-[9px] font-extrabold text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </div>

          <div className="hidden wide:block"><FySelector /></div>
          <div className="hidden w-[150px] desktop:block 2xl:w-[168px]"><BranchSwitcher branch={branch} setBranch={setBranch} currentUser={currentUser} light /></div>

          <UserMenu currentUser={currentUser} setCurrentUser={setCurrentUser} setRoute={setRoute} />

          {/* Hamburger (mobile/tablet) */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-muted transition-all duration-fast ease-premium hover:bg-ink/[0.06] hover:text-ink desktop:hidden"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* ── Mobile slide-over ────────────────────────────────────────── */}
      {mobileOpen && (
        <>
          <div className="noprint fixed inset-0 z-50 animate-kb-fade-in bg-ink/40 backdrop-blur-sm desktop:hidden" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <aside className="noprint fixed inset-y-0 right-0 z-50 flex w-[300px] max-w-[88vw] flex-col bg-surface shadow-brand-lg desktop:hidden" style={{ animation: 'kb-rise 240ms cubic-bezier(0.22,1,0.36,1) both' }}>
            <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
              <span className="text-sm font-bold text-navy">Menu</span>
              <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close menu" className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-muted transition-all duration-fast ease-premium hover:bg-ink/[0.06] hover:text-ink"><X size={18} /></button>
            </div>
            <div className="space-y-2 border-b border-surface-border p-3">
              <ModuleSearch branch={branch} currentUser={currentUser} setRoute={(r) => go(r)} bar />
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1"><BranchSwitcher branch={branch} setBranch={setBranch} currentUser={currentUser} light /></div>
                <FySelector />
              </div>
            </div>
            <nav aria-label="Primary mobile" className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
              {menu.map((item, i) => <MobileNode key={i} node={item} route={route} go={go} />)}
            </nav>
          </aside>
        </>
      )}

      {/* ── Content (full width, no sidebar) ─────────────────────────── */}
      {/* min-h-0 is REQUIRED: without it this flex item keeps min-height:auto and
          grows to its content height, so a tall page overflows the h-screen root
          (overflow-hidden) and the inner <main> never gets a bounded height to
          scroll within — the page becomes unscrollable. */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {currentUser?.viewOnly && (
          <div className="noprint flex shrink-0 items-center justify-center gap-2 border-b border-amber-300 bg-amber-50 px-3 py-1.5 text-[11.5px] font-semibold text-amber-800">
            <Eye size={13} />
            View only — you can browse and open records, but changes are disabled for this account.
          </div>
        )}
        {subBar && <div className="noprint shrink-0">{subBar}</div>}
        <main className="min-h-0 flex-1 overflow-y-auto bg-surface-alt">{children}</main>
      </div>

      {/* Notifications overlay */}
      {showNotif && (
        <>
          <div className="noprint fixed inset-0 z-[599]" onClick={() => setShowNotif(false)} />
          <NotifPanel onClose={() => setShowNotif(false)} setRoute={(r) => { setRoute && setRoute(r); setShowNotif(false); }} />
        </>
      )}
    </div>
  );
}

export default AppShell;
