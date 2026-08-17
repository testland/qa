import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    hookTimeout: 240_000,
    testTimeout: 30_000,
    fileParallelism: false,
  },
});
