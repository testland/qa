import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cachePath } from '../src/config.mjs';

test('the cache directory belongs to the user running the CLI', () => {
  const root = mkdtempSync(join(tmpdir(), 'acme-'));
  const dir = cachePath(root);
  mkdirSync(dir, { recursive: true });
  assert.equal(statSync(dir).uid, process.getuid());
  rmSync(root, { recursive: true, force: true });
});
