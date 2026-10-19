import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    host: true
  },
  test: {
    environment: 'jsdom',
    include: ['src/tests/unit/**/*.test.ts', 'src/tests/integration/**/*.test.ts'],
    exclude: ['src/tests/e2e/**', 'node_modules/**']
  }
});
