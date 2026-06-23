// ───────────────────────────────────────────────────────────────────────────
// Menu — the shared accessible dropdown/menu primitive (WS1).
//
// One keyboard model for every menu in the app (account menu, branch switcher,
// row actions, …). The panel is PORTALED to <body> so it floats above the
// blurred app-bar's stacking context. Roving focus + type-ahead come from the
// shared helpers in ./focus so behaviour stays identical across consumers.
//
//   <Menu
//     ariaLabel="Account menu"
//     align="right"
//     menuRole="menu"                       // or "listbox" for single-select
//     items={[{ key, label, icon, danger, disabled, selected, onSelect }]}
//     renderTrigger={({ ref, open, toggle, triggerProps }) => (
//       <button ref={ref} {...triggerProps} onClick={toggle}>…</button>
//     )}
//   />
//
// Keyboard: Enter/Space/↓ open (focus first), ↑ open (focus last); ↑/↓ move,
// Home/End jump, type-ahead by label; Enter/Space activate; Esc/Tab close and
// return focus to the trigger. Outside-click closes.
// ───────────────────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { rovingNextIndex } from './focus';

export function Menu({ renderTrigger, items = [], align = 'left', width, menuRole = 'menu', ariaLabel }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const itemRefs = useRef([]);
  const typeahead = useRef({ buffer: '', timer: null });

  // Item indices that can actually be focused/selected (skip disabled).
  const enabled = items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0);

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const w = width || Math.max(r.width, 200);
    let left = align === 'right' ? r.right - w : r.left;
    left = Math.max(8, Math.min(left, vw - w - 8));
    setPos({ top: r.bottom + 4, left, width: w });
  }, [align, width]);

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    setActiveIndex(-1);
    if (restoreFocus && triggerRef.current) { try { triggerRef.current.focus(); } catch { /* ignore */ } }
  }, []);

  const openMenu = useCallback((edge = 'first') => {
    place();
    setOpen(true);
    setActiveIndex(edge === 'last' ? (enabled[enabled.length - 1] ?? -1) : (enabled[0] ?? -1));
  }, [place, enabled]);

  const select = useCallback((i) => {
    const it = items[i];
    if (!it || it.disabled) return;
    close(true);
    if (typeof it.onSelect === 'function') it.onSelect();
  }, [items, close]);

  // Focus the active item as roving focus moves.
  useEffect(() => {
    if (open && activeIndex >= 0) {
      const el = itemRefs.current[activeIndex];
      if (el) { try { el.focus(); } catch { /* ignore */ } }
    }
  }, [open, activeIndex]);

  // Outside-click + reposition while open.
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => {
      if (triggerRef.current && triggerRef.current.contains(e.target)) return;
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      close(false);
    };
    const reflow = () => place();
    document.addEventListener('mousedown', onPointer);
    window.addEventListener('resize', reflow);
    window.addEventListener('scroll', reflow, true);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      window.removeEventListener('resize', reflow);
      window.removeEventListener('scroll', reflow, true);
    };
  }, [open, place, close]);

  const moveTo = useCallback((key) => {
    if (!enabled.length) return false;
    const curPos = Math.max(0, enabled.indexOf(activeIndex));
    const nextPos = rovingNextIndex(key, curPos, enabled.length, { orientation: 'vertical' });
    if (nextPos == null) return false;
    setActiveIndex(enabled[nextPos]);
    return true;
  }, [enabled, activeIndex]);

  const onTriggerKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMenu('first'); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); openMenu('last'); }
  };

  const onMenuKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); return; }
    if (e.key === 'Tab') { e.preventDefault(); close(true); return; }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(activeIndex); return; }
    if (moveTo(e.key)) { e.preventDefault(); return; }
    // Type-ahead: jump to the next enabled item whose label starts with the buffer.
    if (e.key.length === 1 && /\S/.test(e.key)) {
      const ta = typeahead.current;
      ta.buffer += e.key.toLowerCase();
      if (ta.timer) clearTimeout(ta.timer);
      ta.timer = setTimeout(() => { ta.buffer = ''; }, 600);
      const match = enabled.find((i) => String(items[i].label || '').toLowerCase().startsWith(ta.buffer));
      if (match != null) { setActiveIndex(match); e.preventDefault(); }
    }
  };

  const itemRole = menuRole === 'listbox' ? 'option' : 'menuitem';

  return (
    <>
      {renderTrigger({
        ref: triggerRef,
        open,
        toggle: () => (open ? close(true) : openMenu('first')),
        triggerProps: {
          'aria-haspopup': menuRole,
          'aria-expanded': open,
          onKeyDown: onTriggerKeyDown,
        },
      })}
      {open && pos && createPortal(
        <div
          ref={menuRef}
          role={menuRole}
          aria-label={ariaLabel}
          onKeyDown={onMenuKeyDown}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 99999 }}
          className="overflow-hidden rounded-lg border border-surface-border bg-surface py-1 shadow-brand-lg"
        >
          {items.map((it, i) => (
            <button
              key={it.key ?? i}
              ref={(el) => { itemRefs.current[i] = el; }}
              type="button"
              role={itemRole}
              aria-selected={menuRole === 'listbox' ? !!it.selected : undefined}
              disabled={it.disabled}
              tabIndex={-1}
              onClick={() => select(i)}
              onMouseEnter={() => !it.disabled && setActiveIndex(i)}
              className={[
                'flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition',
                'focus:outline-none focus-visible:bg-surface-alt',
                it.disabled ? 'cursor-not-allowed text-ink-subtle' : 'cursor-pointer hover:bg-surface-alt',
                activeIndex === i && !it.disabled ? 'bg-surface-alt' : '',
                it.danger ? 'text-danger' : 'text-ink',
              ].filter(Boolean).join(' ')}
            >
              {it.icon && <it.icon size={15} className="shrink-0" aria-hidden="true" />}
              <span className="flex-1 truncate">{it.label}</span>
              {menuRole === 'listbox' && it.selected && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}

export default Menu;
