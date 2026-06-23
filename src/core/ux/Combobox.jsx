// ───────────────────────────────────────────────────────────────────────────
// Combobox — accessible, type-ahead single-select picker (WS1).
//
// Replaces plain <select> / div-based pickers for LONG lists (ledgers,
// customers, parties) where users need to filter by typing. Implements the
// ARIA combobox + listbox pattern with aria-activedescendant, so the active
// option is announced without moving DOM focus off the input.
//
//   <Combobox
//     value={ledgerId}
//     options={[{ value, label, sublabel }]}
//     onChange={setLedgerId}
//     placeholder="Search ledger…"
//     ariaLabel="Ledger"
//     invalid={!ledgerId}
//   />
//
// Keyboard: type to filter; ↑/↓ move the active option; Home/End jump; Enter
// selects; Esc closes and reverts; Tab selects the active option and moves on.
// ───────────────────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { rovingNextIndex } from './focus';

export function Combobox({
  value,
  options = [],
  onChange,
  placeholder = 'Search…',
  ariaLabel,
  invalid = false,
  disabled = false,
  className = '',
  id,
}) {
  const reactId = React.useId();
  const listId = `${id || reactId}-listbox`;
  const optId = (i) => `${id || reactId}-opt-${i}`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  const selected = options.find((o) => o.value === value) || null;
  const selectedLabel = selected ? selected.label : '';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => String(o.label || '').toLowerCase().includes(q)
      || String(o.sublabel || '').toLowerCase().includes(q));
  }, [options, query]);

  // Keep the active option in range as the filter narrows.
  useEffect(() => { setActiveIndex((i) => Math.min(Math.max(i, 0), Math.max(filtered.length - 1, 0))); }, [filtered.length]);

  // Close + revert when clicking outside.
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) closeRevert(); };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const closeRevert = () => { setOpen(false); setQuery(''); };

  const choose = (opt) => {
    if (!opt) return;
    if (typeof onChange === 'function') onChange(opt.value);
    setOpen(false);
    setQuery('');
    if (inputRef.current) { try { inputRef.current.focus(); } catch { /* ignore */ } }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { if (open) { e.preventDefault(); e.stopPropagation(); closeRevert(); } return; }
    if (e.key === 'ArrowDown' && !open) { e.preventDefault(); setOpen(true); setActiveIndex(0); return; }
    if (!open) return;
    if (e.key === 'Enter') { e.preventDefault(); choose(filtered[activeIndex]); return; }
    if (e.key === 'Tab') { if (filtered[activeIndex]) choose(filtered[activeIndex]); return; }
    const next = rovingNextIndex(e.key, activeIndex, filtered.length, { orientation: 'vertical' });
    if (next != null) { e.preventDefault(); setActiveIndex(next); }
  };

  const inputValue = open ? query : selectedLabel;

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && filtered[activeIndex] ? optId(activeIndex) : undefined}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        value={inputValue}
        placeholder={placeholder}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActiveIndex(0); }}
        onClick={() => { if (!disabled) setOpen(true); }}
        onKeyDown={onKeyDown}
        className={[
          'h-9 w-full rounded-md border bg-surface px-3 pr-8 text-[13px] text-ink outline-none transition',
          'placeholder:text-ink-subtle focus:border-gold focus:shadow-gold-glow max-tablet:min-h-[44px]',
          'disabled:cursor-not-allowed disabled:bg-surface-alt disabled:text-ink-muted',
          invalid ? 'border-danger' : 'border-surface-border',
        ].join(' ')}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute z-[9999] mt-1 max-h-60 w-full overflow-auto rounded-md border border-surface-border bg-surface py-1 shadow-brand-lg"
        >
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-[12px] text-ink-subtle">No matches</li>
          )}
          {filtered.map((o, i) => (
            <li
              key={o.value}
              id={optId(i)}
              role="option"
              aria-selected={o.value === value}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseDown={(e) => { e.preventDefault(); choose(o); }}
              className={[
                'cursor-pointer px-3 py-2 text-[13px]',
                activeIndex === i ? 'bg-surface-alt' : '',
                o.value === value ? 'font-semibold text-navy' : 'text-ink',
              ].filter(Boolean).join(' ')}
            >
              {o.label}
              {o.sublabel && <span className="ml-1 text-[11px] text-ink-subtle">{o.sublabel}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Combobox;
