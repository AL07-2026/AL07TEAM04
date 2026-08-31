import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  envPrefix: ['VITE_', 'WORKNET_JOB_API_KEY'],
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // The local interview helper does not expose the job catalog route.
      // Proxy job searches to the deployed API so local card previews use the same results as main.
      '/api/jobs': {
        target: 'https://al07team04-bdfcd.web.app',
        changeOrigin: true,
        secure: true,
      },
      '/api': 'http://127.0.0.1:8787',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(rootDirectory, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['src/main.tsx', 'src/test/**'],
    },
  },
});
