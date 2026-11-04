import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Pure-logic tests only (no React Native runtime).
export default defineConfig({
  test: { include: ['src/**/*.test.ts'] },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
});
