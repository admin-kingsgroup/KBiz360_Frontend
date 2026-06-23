/** @type {import('tailwindcss').Config} */
/* ════════════════════════════════════════════════════════════════════
   KBiz360 Pro — premium visual system (graphite + refined gold)
   ════════════════════════════════════════════════════════════════════
   The legacy token NAMES (navy / gold / ink / surface / success…) are kept
   so every existing class re-themes automatically, but their VALUES are
   re-based to a calmer, premium palette:
     • graphite near-black replaces saturated navy
     • refined champagne gold replaces brassy gold
     • soft near-white surfaces, subtle low-contrast borders, soft shadows
   New semantic aliases (primary / accent / info / elevated …) are added for
   forward-looking components. Values mirror the CSS variables in index.css.
   ──────────────────────────────────────────────────────────────────── */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ─── Primary brand — premium graphite (legacy name: navy) ───
        navy: {
          DEFAULT: '#1a1c22',   // graphite near-black
          light:   '#2e323c',   // hover / secondary
        },
        primary: {
          DEFAULT: '#1a1c22',
          hover:   '#2e323c',
          fg:      '#ffffff',
        },

        // ─── Accent — refined champagne gold (legacy name: gold) ───
        gold: {
          DEFAULT: '#c2a04a',   // refined, less brassy
          dark:    '#98792c',   // hover / pressed
          light:   '#efe3bf',   // soft backgrounds
        },
        accent: {
          DEFAULT: '#c2a04a',
          hover:   '#98792c',
          soft:    '#f6efda',
          fg:      '#1a1c22',
        },

        maroon: { DEFAULT: '#b3261e', dark: '#3c1b14' },

        // ─── Pinwheel logo colors (unchanged brand marks) ───
        pinwheel: {
          purple: '#9070C8', blue: '#4A90D9', teal: '#3FB7A3',
          orange: '#E5A042', red: '#C9554B', grey: '#A9ACB6',
        },

        // ─── Ink (text) — rich near-black + muted scale ───
        ink: {
          DEFAULT: '#14161a',   // body / foreground
          muted:   '#5b616e',   // secondary
          subtle:  '#9197a3',   // tertiary
        },

        // ─── Surfaces — layered near-white, subtle borders ───
        surface: {
          DEFAULT: '#ffffff',   // card / panel
          alt:     '#f4f5f7',   // muted surface / page sections
          border:  '#e6e8ec',   // subtle low-contrast divider
        },
        bg:       '#f7f8fa',     // app background (soft neutral)
        elevated: '#ffffff',     // raised surface (use with shadow-pop)

        // ─── Role colors (avatars / badges) ───
        role: {
          admin: '#b3261e', director: '#3c1b14', srfm: '#1a1c22',
          srae: '#6B4C8B', ae: '#2F7A8E', hr: '#384677',
        },

        // ─── Semantic status — modern, with soft tints ───
        success: { DEFAULT: '#16a34a', soft: '#e8f6ed' },
        warning: { DEFAULT: '#d97706', soft: '#fbeedb' },
        danger:  { DEFAULT: '#dc2626', soft: '#fbe9e9' },
        info:    { DEFAULT: '#2563eb', soft: '#e8f0ff' },
      },

      fontFamily: {
        sans: ['Inter', 'InterVariable', '-apple-system', 'BlinkMacSystemFont',
               '"SF Pro Text"', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        mono: ['"SF Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },

      // ─── Soft, realistic elevation (premium, not heavy) ───
      boxShadow: {
        xs:    '0 1px 2px rgba(16,18,22,0.05)',
        sm:    '0 1px 2px rgba(16,18,22,0.04), 0 1px 3px rgba(16,18,22,0.06)',
        card:  '0 1px 2px rgba(16,18,22,0.04), 0 6px 20px -10px rgba(16,18,22,0.12)',
        pop:   '0 16px 40px -12px rgba(16,18,22,0.20), 0 2px 8px -4px rgba(16,18,22,0.10)',
        brand: '0 4px 16px -6px rgba(26,28,34,0.16)',
        'brand-lg': '0 28px 64px -16px rgba(16,18,22,0.32)',
        'gold-glow': '0 0 0 3px rgba(194,160,74,0.28)',
        'focus-ring': '0 0 0 3px rgba(37,99,235,0.22)',
      },

      borderRadius: {
        brand: '12px',     // standard card radius (8–14 system)
        xl2:   '16px',
      },

      letterSpacing: { 'brand-tagline': '1.5px', tight2: '-0.02em' },

      transitionTimingFunction: {
        premium: 'cubic-bezier(0.22, 1, 0.36, 1)',   // smooth, refined ease-out
        snappy:  'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: { fast: '140ms', med: '240ms' },

      keyframes: {
        'kb-shimmer': { '100%': { transform: 'translateX(100%)' } },
        'kb-fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'kb-rise':    { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'kb-pop':     { from: { opacity: '0', transform: 'scale(0.97)' }, to: { opacity: '1', transform: 'scale(1)' } },
      },
      animation: {
        'kb-fade-in': 'kb-fade-in 200ms cubic-bezier(0.22,1,0.36,1) both',
        'kb-rise':    'kb-rise 240ms cubic-bezier(0.22,1,0.36,1) both',
        'kb-pop':     'kb-pop 180ms cubic-bezier(0.22,1,0.36,1) both',
      },

      // Mobile-first breakpoints (match useMobile()'s 768px threshold). `wide` (1400px) is
      // where the header has room for the secondary controls (FY / Print) alongside the
      // full 8-pill nav — below it they're hidden so the nav never clips on small laptops.
      screens: { tablet: '768px', desktop: '1024px', wide: '1400px' },
    },
  },
  plugins: [],
};
