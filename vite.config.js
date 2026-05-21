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
        // Split vendors for better browser caching
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'charts': ['recharts'],
          'icons': ['lucide-react'],
          'state': ['zustand', '@tanstack/react-query'],
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
