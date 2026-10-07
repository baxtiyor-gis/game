import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { target: 'es2022', chunkSizeWarningLimit: 8192 },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
} as never);
