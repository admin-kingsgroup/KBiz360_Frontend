/* ════════════════════════════════════════════════════════════════════
   SHELL/PHASE2_PAGE.JSX — shared admin/settings page scaffold
   ════════════════════════════════════════════════════════════════════
   Drop-in (same props: title / subtitle / toolbar / children), now routed
   through the responsive PageLayout so every one of its ~46 usages across
   settings, hr, taxation, ho-control, transactions, finance, reports and
   masters gets a consistent, mobile-friendly header + responsive padding
   with a single change. `toolbar` maps to PageLayout's wrapping actions row.
   ──────────────────────────────────────────────────────────────────── */

import React from 'react';
import { PageLayout } from './PageLayout';

export function PHASE2_Page({ title, subtitle, toolbar, children }) {
  return (
    <PageLayout title={title} subtitle={subtitle} actions={toolbar}>
      {children}
    </PageLayout>
  );
}

export default PHASE2_Page;
