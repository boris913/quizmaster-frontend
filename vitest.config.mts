import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Aligné sur "paths" de tsconfig.json : "@/*" -> "./src/*"
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Les tests Playwright vivent dans e2e/ et ne doivent pas être exécutés par Vitest.
    exclude: ['node_modules', '.next', 'e2e/**'],
    css: false,
  },
});
