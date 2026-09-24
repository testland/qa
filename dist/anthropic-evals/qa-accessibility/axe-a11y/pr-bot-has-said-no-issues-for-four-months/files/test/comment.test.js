import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderComment } from '../lib/comment.js';

function fixture(results) {
  const dir = mkdtempSync(join(tmpdir(), 'a11y-'));
  const path = join(dir, 'results.json');
  writeFileSync(path, JSON.stringify(results));
  return path;
}

test('names a critical violation in the comment', () => {
  const path = fixture({
    url: 'https://staging.shopfront.example/',
    violations: [
      { id: 'image-alt', impact: 'critical', nodes: [{ target: ['img.hero'] }] },
    ],
    incomplete: [],
    passes: [],
    inapplicable: [],
  });

  assert.match(renderComment(path), /image-alt/);
});
