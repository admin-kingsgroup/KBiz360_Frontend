// ───────────────────────────────────────────────────────────────────────────
// SmartDateInput — thin wrapper over a native <input type="date">, controlled
// via an ISO (YYYY-MM-DD) value/onChange. `min`/`max` (ISO) bound the allowed
// range — e.g. min={todayISO()} disables every past date.
// ───────────────────────────────────────────────────────────────────────────
import React from 'react';

export function SmartDateInput({ value, onChange, min, max, style, ...rest }) {
  return (
    <input
      type="date"
      value={value || ''}
      onChange={(e) => onChange && onChange(e.target.value)}
      min={min}
      max={max}
      style={style}
      {...rest}
    />
  );
}

export default SmartDateInput;
