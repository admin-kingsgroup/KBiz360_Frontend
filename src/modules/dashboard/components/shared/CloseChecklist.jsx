import React from 'react';
import { MONTH_CLOSE_CHECKLIST } from '../../utils/constants';

export function CloseChecklist({ items = MONTH_CLOSE_CHECKLIST, defaultCheckedThrough = 5 }) {
  return (
    <>
      {items.map((item, i) => (
        <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
          <input type="checkbox" defaultChecked={i < defaultCheckedThrough} style={{ cursor: 'pointer' }} />
          <span style={{ fontSize: 11.5, color: '#0d1326' }}>{item}</span>
        </div>
      ))}
    </>
  );
}
