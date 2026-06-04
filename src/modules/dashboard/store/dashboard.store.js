import { create } from 'zustand';

/**
 * Dashboard UI state — what the user has selected on the dashboard screens.
 * Server-derived data (bills, KPIs, etc.) belongs in TanStack Query, not here.
 *
 *   period           — Day | Week | Month | Quarter | YTD filter, shared by
 *                      every role dashboard so the header dropdown survives
 *                      navigation between role views.
 *   range            — live-figure period mode: 'month' (current month, default)
 *                      | 'ytd' (FY-to-date) | 'all' (since inception). Drives the
 *                      double-entry queries on the dashboards.
 *   scope            — branch scope for the figures: 'ALL' (Group / all branches,
 *                      default) or a branch code (e.g. 'BOM').
 *   compareLastYear  — toggles overlay on the Director revenue chart.
 *   pinnedWidgets    — { [widgetKey]: true } for the Director board.
 */
export const useDashboardStore = create((set) => ({
  period: 'Month',
  range: 'month',
  scope: 'ALL',
  compareLastYear: true,
  pinnedWidgets: {},

  setPeriod: (period) => set({ period }),
  setRange: (range) => set({ range }),
  setScope: (scope) => set({ scope }),
  setCompareLastYear: (compareLastYear) => set({ compareLastYear }),
  togglePinnedWidget: (key) =>
    set((state) => ({
      pinnedWidgets: { ...state.pinnedWidgets, [key]: !state.pinnedWidgets[key] },
    })),
  resetPins: () => set({ pinnedWidgets: {} }),
}));
