import React from 'react';

// Honest "this isn't live data" banner. Use on any reachable screen that still
// renders hardcoded/sample figures (no live backend wiring yet) so a user never
// mistakes invented numbers for the real books. Drop it in as the first child of
// the screen's main container.
//
//   <SampleBanner />                                   // default copy
//   <SampleBanner note="GSTR-9C reconciliation isn't wired to live data yet." />
export function SampleBanner({ note }) {
  return (
    <div
      role="note"
      style={{
        margin: '0 0 12px', padding: '8px 12px', background: '#FAEEDA',
        border: '1px solid #f0d28a', borderRadius: 8, fontSize: 11.5,
        color: '#854F0B', fontWeight: 600,
      }}
    >
      ⚠ Sample data — {note || "this screen isn’t wired to your live books yet. Do not use for reporting or decisions."}
    </div>
  );
}

export default SampleBanner;
