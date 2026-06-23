/* Minimal ESLint config — a11y guardrail only.
   Purpose: flag NEW interactive non-button elements (`<div onClick>` without
   keyboard support) so the ~120 keyboard conversions don't silently rot. Scoped
   to the two high-signal jsx-a11y rules at WARN level so it never blocks builds;
   run via `npm run lint`. Uses ESLint's default espree parser (handles JSX) —
   no Babel parser needed. */
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
  // react-hooks is declared (not enabled) only so the existing
  // `// eslint-disable react-hooks/exhaustive-deps` comments resolve to a known rule.
  plugins: ['jsx-a11y', 'react-hooks'],
  ignorePatterns: [
    'dist/', 'node_modules/', 'coverage/',
    '**/*.test.js', '**/*.test.jsx', '**/__tests__/**',
    // Dead/unrendered legacy shell (replaced by AppShell) — excluded so the
    // guardrail's signal reflects live code only.
    'src/shell/TopNav.jsx', 'src/shell/TopBar.jsx', 'src/shell/SideNav.jsx', 'src/shell/UserSwitcher.jsx',
  ],
  rules: {
    // The two rules that catch mouse-only interactive elements. Spread the shared
    // `clickable()` helper (src/core/ux/clickable.js) onto such elements to satisfy them.
    'jsx-a11y/no-static-element-interactions': 'warn',
    'jsx-a11y/click-events-have-key-events': 'warn',
  },
};
