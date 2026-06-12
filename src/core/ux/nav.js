// Navigation context. App owns the route + history stack and provides the value;
// any component calls useNav() to read the route or move through history.
import { createContext, useContext } from 'react';

export const NavContext = createContext(null);

const FALLBACK = {
  route: '/dashboard',
  navigate: () => {},
  goBack: () => {},
  goForward: () => {},
  canBack: false,
  canForward: false,
  recents: [],
};

export const useNav = () => useContext(NavContext) || FALLBACK;
