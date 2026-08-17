import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    lib: { entry: 'src/index.js', formats: ['es'], fileName: 'pricing-rules' },
  },
  test: {
    includeSource: ['src/**/*.js'],
  },
});
