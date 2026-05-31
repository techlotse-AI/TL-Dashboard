import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // In dev, proxy API calls to the backend container / local server
      '/api': {
        target: process.env.VITE_API_URL ?? 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Vite 8 uses Rolldown which requires manualChunks as a function
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor';
          }
          if (
            id.includes('node_modules/date-fns') ||
            id.includes('node_modules/lucide-react')
          ) {
            return 'utils';
          }
        },
      },
    },
  },
});
