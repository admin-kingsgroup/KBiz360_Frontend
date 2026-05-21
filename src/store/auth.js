/* ════════════════════════════════════════════════════════════════════
   Auth Store — Zustand
   ════════════════════════════════════════════════════════════════════

   This is SCAFFOLDING. The current app keeps `currentUser` in
   KB360App's local React state. Migrate to this store ONLY when:
     (a) Multiple non-shell modules need to read/write currentUser
     (b) You add real authentication with a backend
     (c) You want to persist auth across page refreshes
       (combine with persist middleware — see Zustand docs)

   Usage when you migrate:
     import { useAuthStore } from '../store/auth';
     const currentUser = useAuthStore(s => s.currentUser);
     const signOut = useAuthStore(s => s.signOut);

   ════════════════════════════════════════════════════════════════════ */

import { create } from 'zustand';

export const useAuthStore = create((set, get) => ({
  // ─── State ───
  currentUser: null,
  lastSignInAt: null,

  // ─── Actions ───
  setCurrentUser: (user) => set({
    currentUser: user,
    lastSignInAt: user ? new Date().toISOString() : null,
  }),

  signOut: () => set({ currentUser: null }),

  // ─── Computed (call as a function) ───
  isSignedIn: () => !!get().currentUser,

  hasRole: (role) => get().currentUser?.role === role,

  hasBranchAccess: (branchCode) => {
    const u = get().currentUser;
    if (!u) return false;
    if (u.branches === 'ALL' || (Array.isArray(u.branches) && u.branches.includes('ALL'))) return true;
    return Array.isArray(u.branches) ? u.branches.includes(branchCode) : u.branches === branchCode;
  },
}));
