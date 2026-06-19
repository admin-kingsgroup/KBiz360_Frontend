/* ════════════════════════════════════════════════════════════════════
   reports/components/scaffold — shared report page chrome
   ════════════════════════════════════════════════════════════════════
   RptShell + NotWired were the two scaffolds every legacy report screen
   shared. They now sit on the app-wide responsive primitives (PageLayout,
   PageSection, Button, EmptyState) so all ~16 report screens that use them
   pick up consistent headers, filter bars and mobile behavior at once.
   Behavior is preserved: RptShell still exposes a print/export action and a
   filters slot; NotWired is still the honest "no live backend yet" notice.
   ──────────────────────────────────────────────────────────────────── */

import React from 'react';
import { Download, Construction } from 'lucide-react';
import { PageLayout } from '../../../shell/PageLayout';
import { PageSection, Button, EmptyState } from '../../../shell/primitives';

/* Report page scaffold: breadcrumb + title + filters + an Export (print) action. */
export function RptShell({ title, subtitle, children, filters }) {
  return (
    <PageLayout
      title={title}
      subtitle={subtitle}
      filters={filters}
      actions={
        <Button variant="primary" size="sm" icon={Download} onClick={() => window.print()}>
          Export
        </Button>
      }
    >
      {children}
    </PageLayout>
  );
}

/* Honest placeholder for report screens with no live backend yet — shown
   instead of fabricated demo figures so the books are never misrepresented. */
export function NotWired({ title, note }) {
  return (
    <PageLayout title={title}>
      <PageSection className="mx-auto max-w-2xl">
        <EmptyState icon={Construction} title="Live data not wired yet" hint={note} />
      </PageSection>
    </PageLayout>
  );
}
