// ───────────────────────────────────────────────────────────────────────────
// SmartDateInput — type-friendly DD/MM/YYYY text input over an ISO value, with a
// calendar picker.
//
// • Type with ANY separator (or none): "20.03.2026", "20-03-2026", "20032026"
//   all auto-format to "20/03/2026" as you type.
// • A 📅 button opens the native calendar (respects min/max — no past dates).
// • Stores/returns ISO (YYYY-MM-DD) via onChange, so callers and the backend are
//   unchanged from a native <input type="date">.
// • `min` / `max` (ISO) bound the allowed range — e.g. min={todayISO()} disables
//   every past date; an out-of-range or impossible date (31/02) flags red and is
//   NOT committed (onChange('')).
// • When a complete, valid, in-range date is entered, focus auto-advances to the
//   next field (override with onComplete) — deferred to after the value commits so
//   the final digit is never dropped.
// ───────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';

const digitsOf = (s) => String(s == null ? '' : s).replace(/\D/g, '').slice(0, 8);

// ISO (YYYY-MM-DD) → display DD/MM/YYYY ('' if not a clean ISO date).
export function isoToDisplay(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

// Insert slashes as the user types: "2003" → "20/03", "20032026" → "20/03/2026".
export function autoFormat(raw) {
  const d = digitsOf(raw);
  let out = d.slice(0, 2);
  if (d.length > 2) out += '/' + d.slice(2, 4);
  if (d.length > 4) out += '/' + d.slice(4, 8);
  return out;
}

// A complete (8-digit) DD/MM/YYYY string → ISO, or null if incomplete/impossible.
// Round-trips the components through a Date so 31/02 etc. are rejected.
export function displayToIso(raw) {
  const d = digitsOf(raw);
  if (d.length !== 8) return null;
  const dd = +d.slice(0, 2), mm = +d.slice(2, 4), yyyy = +d.slice(4, 8);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1000) return null;
  const dt = new Date(yyyy, mm - 1, dd);
  if (dt.getFullYear() !== yyyy || dt.getMonth() !== mm - 1 || dt.getDate() !== dd) return null;
  return `${d.slice(4, 8)}-${d.slice(2, 4)}-${d.slice(0, 2)}`;
}

// Run a callback after the current commit/paint (so a controlled value lands before
// we move focus away — otherwise the blur clobbers the last keystroke).
const deferred = (fn) => (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(fn) : setTimeout(fn, 0));

// Focus the next visible focusable element in document tab order.
function focusNext(el) {
  if (!el || typeof document === 'undefined') return;
  const sel = 'input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const all = Array.from(document.querySelectorAll(sel)).filter((n) => n === el || (n.offsetParent !== null && n.getAttribute('aria-hidden') !== 'true'));
  const i = all.indexOf(el);
  if (i >= 0 && i + 1 < all.length) all[i + 1].focus();
}

export function SmartDateInput({ value, onChange, min, max, onComplete, style, placeholder = 'DD/MM/YYYY', invalidColor = '#dc2626', ...rest }) {
  const ref = useRef(null);
  const pickerRef = useRef(null);
  const [text, setText] = useState(() => isoToDisplay(value));
  const [bad, setBad] = useState(false);
  const textRef = useRef(text);          // always-fresh text, so blur never reads a stale closure
  textRef.current = text;

  // Sync from an EXTERNAL value change (edit-mode load) only — never when the value
  // is empty, so our own onChange('') on an invalid entry can't wipe what's typed.
  useEffect(() => {
    const disp = isoToDisplay(value);
    if (value && disp && disp !== textRef.current) { setText(disp); textRef.current = disp; }
  }, [value]);

  // Validate the current formatted string and push the result up. Does NOT setText,
  // so it's safe to call from blur without clobbering the displayed value.
  const validate = (formatted) => {
    const iso = displayToIso(formatted);
    const complete = digitsOf(formatted).length === 8;
    if (iso == null) { setBad(complete); onChange && onChange(''); return false; }
    if ((min && iso < min) || (max && iso > max)) { setBad(true); onChange && onChange(''); return false; }
    setBad(false);
    onChange && onChange(iso);
    return true;
  };

  const onType = (raw) => {
    const prevComplete = digitsOf(textRef.current).length === 8;
    const formatted = autoFormat(raw);
    setText(formatted);
    textRef.current = formatted;
    const ok = validate(formatted);
    // Advance only on the keystroke that COMPLETES a valid date — AFTER it commits.
    if (ok && digitsOf(formatted).length === 8 && !prevComplete) {
      const el = ref.current;
      deferred(() => (onComplete || focusNext)(el));
    }
  };

  // Calendar pick → set the text/value (native picker already respects min/max).
  const onPick = (iso) => {
    if (!iso) return;
    const disp = isoToDisplay(iso);
    setText(disp); textRef.current = disp;
    validate(disp);
  };
  const openPicker = () => {
    const el = pickerRef.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') { try { el.showPicker(); return; } catch { /* needs gesture / unsupported */ } }
    el.focus(); el.click();
  };

  return (
    <span style={{ position: 'relative', display: 'block' }}>
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={text}
        onChange={(e) => onType(e.target.value)}
        onBlur={() => validate(textRef.current)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const el = ref.current; deferred(() => (onComplete || focusNext)(el)); } }}
        aria-invalid={bad || undefined}
        style={{ ...style, paddingRight: 30, ...(bad ? { borderColor: invalidColor, outlineColor: invalidColor } : null) }}
        {...rest}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={openPicker}
        aria-label="Open calendar"
        title="Pick from calendar"
        style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 2 }}
      >📅</button>
      {/* off-screen native date input drives the calendar; respects min/max */}
      <input
        ref={pickerRef}
        type="date"
        aria-hidden="true"
        tabIndex={-1}
        min={min}
        max={max}
        value={displayToIso(text) || ''}
        onChange={(e) => onPick(e.target.value)}
        style={{ position: 'absolute', right: 6, bottom: 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none', border: 0, padding: 0 }}
      />
    </span>
  );
}

export default SmartDateInput;
