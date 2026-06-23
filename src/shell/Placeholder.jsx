/* ════════════════════════════════════════════════════════════════════
   SHELL/PLACEHOLDER.JSX — premium "not wired yet" page
   ════════════════════════════════════════════════════════════════════
   Migrated to the KBiz360 Pro scaffold (PageLayout + EmptyState + Button).
   Route title + back-to-dashboard behavior unchanged.
   ──────────────────────────────────────────────────────────────────── */

import React from 'react';
import { ArrowLeft, Wrench } from 'lucide-react';
import { ROUTE_TITLES } from '../core/data';
import { PageLayout } from './PageLayout';
import { Button, EmptyState } from './primitives';

export function Placeholder({ route, setRoute }) {
  const title = ROUTE_TITLES[route] || route;
  return (
    <PageLayout title={title}>
      <div className="mx-auto max-w-2xl rounded-brand border border-surface-border bg-surface shadow-card">
        <EmptyState
          icon={Wrench}
          title="This module isn’t wired up yet"
          hint="It follows the same pattern as Sales — Flight Tickets. All sales/purchase modules ship in the Next.js project zip."
          action={<Button variant="primary" icon={ArrowLeft} onClick={() => setRoute('/dashboard')}>Back to dashboard</Button>}
        />
      </div>
    </PageLayout>
  );
}
