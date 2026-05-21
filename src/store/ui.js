/* ════════════════════════════════════════════════════════════════════
   UI Store — Zustand
   ════════════════════════════════════════════════════════════════════

   Manages app-wide UI state: sidebar open/closed, active branch,
   active route, modal stacks, toast notifications.

   SCAFFOLDING — currently the app keeps these in KB360App local state.
   Migrate progressively as the app grows.

   Usage:
     import { useUIStore } from '../store/ui';
     const sideOpen = useUIStore(s => s.sideOpen);
     const toggleSide = useUIStore(s => s.toggleSide);

   ════════════════════════════════════════════════════════════════════ */

import { create } from 'zustand';

export const useUIStore = create((set) => ({
  // ─── Layout ───
  sideOpen: true,
  toggleSide: () => set((s) => ({ sideOpen: !s.sideOpen })),
  setSideOpen: (open) => set({ sideOpen: open }),

  // ─── Active branch ───
  activeBranch: null,
  setActiveBranch: (branch) => set({ activeBranch: branch }),

  // ─── Active route ───
  route: '/dashboard',
  setRoute: (route) => set({ route }),

  // ─── Toast notifications (light pattern) ───
  toasts: [],
  pushToast: (toast) => set((s) => ({
    toasts: [...s.toasts, { id: Date.now(), ...toast }],
  })),
  dismissToast: (id) => set((s) => ({
    toasts: s.toasts.filter(t => t.id !== id),
  })),
}));
