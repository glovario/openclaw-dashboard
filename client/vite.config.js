import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Build into the Express static folder
    outDir: '../public',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to Express during dev
      '/api': {
        target: 'http://localhost:3420',
        changeOrigin: true,
      },
    },
  },
});
