import { create } from 'zustand';

/**
 * Dashboard UI state — what the user has selected on the dashboard screens.
 * Server-derived data (bills, KPIs, etc.) belongs in TanStack Query, not here.
 *
 *   period           — Day | Week | Month | Quarter | YTD filter, shared by
 *                      every role dashboard so the header dropdown survives
 *                      navigation between role views.
 *   range            — live-figure period mode: 'month' (current month) |
 *                      'quarter' (current FY quarter) | 'ytd' (FY-to-date) |
 *                      'all' (since inception, default). Drives the double-entry
 *                      queries on the dashboards. Defaults to 'all' so the headline
 *                      figures always reflect the data actually on the books, even
 *                      when the current month/quarter/FY has no postings yet; the
 *                      user can narrow to a current period from the control bar.
 *   scope            — branch scope for the figures: 'ALL' (Group / all branches,
 *                      default) or a branch code (e.g. 'BOM').
 *   compareLastYear  — toggles overlay on the Director revenue chart.
 *   pinnedWidgets    — { [widgetKey]: true } for the Director board.
 */
export const useDashboardStore = create((set) => ({
  period: 'Month',
  range: 'all',
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
