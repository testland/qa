import { defineConfig } from 'vitest/config';

// Scope discovery to the tooling. The compiled Anthropic fixtures under
// plugins/**/evals/*/files/ are CommonJS sources that only ever run inside an
// extracted scenario directory with its own package.json - they are inputs to a
// test, not tests, and must never be collected here.
export default defineConfig({
  test: {
    include: ['scripts/ts/**/*.test.ts'],
    exclude: ['**/node_modules/**', 'plugins/**'],
  },
});
