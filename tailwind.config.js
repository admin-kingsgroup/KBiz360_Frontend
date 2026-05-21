/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ─── KBiz360 brand palette ───
        navy: {
          DEFAULT: '#0d1326',          // primary brand background
          light:   '#1a2340',          // gradient secondary
        },
        gold: {
          DEFAULT: '#d4a437',          // primary accent / CTAs
          dark:    '#9a6810',          // hover/pressed state
          light:   '#f7d97a',          // backgrounds, highlights
        },
        maroon: {
          DEFAULT: '#A32D2D',          // alerts, Travkings accent
          dark:    '#3C1B14',          // Director role color
        },

        // ─── Pinwheel logo colors (the 6 blades) ───
        pinwheel: {
          purple: '#9070C8',
          blue:   '#4A90D9',
          teal:   '#3FB7A3',
          orange: '#E5A042',
          red:    '#C9554B',
          grey:   '#A9ACB6',
        },

        // ─── Semantic neutrals (replaces inline-style greys) ───
        ink: {
          DEFAULT: '#1a1a1a',          // body text
          muted:   '#5a6691',          // secondary text  (was greyText)
          subtle:  '#8b94b3',          // tertiary text
        },
        surface: {
          DEFAULT: '#ffffff',          // card bg
          alt:     '#f7f8fb',          // page bg       (was greyBg)
          border:  '#e1e3ec',          // dividers      (was greyBorder)
        },

        // ─── Role colors (for avatars, badges) ───
        role: {
          admin:    '#A32D2D',         // Super Admin (= maroon)
          director: '#3C1B14',         // Director    (= maroon-dark)
          srfm:     '#0d1326',         // Sr. FM      (= navy)
          srae:     '#6B4C8B',         // Sr. AE
          ae:       '#2F7A8E',         // Accounts Executive
          hr:       '#384677',         // HR Manager
        },

        // ─── Status colors ───
        success: '#22c55e',
        warning: '#f97316',
        danger:  '#dc3545',
      },

      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },

      boxShadow: {
        // Brand-themed shadows
        'brand': '0 4px 14px rgba(13, 19, 38, 0.15)',
        'brand-lg': '0 20px 60px rgba(13, 19, 38, 0.5)',
        'gold-glow': '0 0 0 3px rgba(212, 164, 55, 0.25)',
      },

      borderRadius: {
        'brand': '12px',                // standard card radius
      },

      letterSpacing: {
        'brand-tagline': '1.5px',       // for "THE BUSINESS ENGINE" caps
      },

      // Mobile-first breakpoints (matches useMobile()'s 768px threshold)
      screens: {
        'tablet': '768px',
        'desktop': '1024px',
      },
    },
  },
  plugins: [],
};
