import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        /* Vendor splitting (browser caching) + a dedicated chunk for the two big
           shared grab-bags (core/styles.jsx, core/helpers.jsx).

           Those two are dynamically imported by App.jsx (lazyModule) AND
           statically imported by many lazy feature chunks. Without an explicit
           assignment, Rollup hoists them — and the recharts they pull — into the
           ENTRY chunk (their only common ancestor), forcing recharts to load on
           first paint. Pinning them to 'kb-core-shared' keeps them (and charts)
           OUT of the entry, so they load on demand with the first screen that
           needs them. */
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) return 'charts';
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('zustand') || id.includes('@tanstack')) return 'state';
            if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/scheduler/')) return 'react-vendor';
            return undefined;
          }
          if (id.includes('/src/core/styles.jsx') || id.includes('/src/core/helpers.jsx')) return 'kb-core-shared';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
});
