import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { shouldSeedBaseline, compareOrSeed } from '../cypress/support/visual.mjs';

const fixtureDir = () => mkdtempSync(join(tmpdir(), 'ledger-visual-'));

test('seeds when there is no baseline for that name yet', () => {
  assert.equal(shouldSeedBaseline(join(fixtureDir(), 'login.png')), true);
});

test('compares when a baseline is already present', () => {
  const dir = fixtureDir();
  writeFileSync(join(dir, 'login.png'), Buffer.from('baseline'));
  assert.equal(shouldSeedBaseline(join(dir, 'login.png')), false);
});

test('reports a match when the captured bytes are identical', () => {
  const dir = fixtureDir();
  writeFileSync(join(dir, 'login.png'), Buffer.from('baseline'));
  const out = compareOrSeed(dir, 'login', Buffer.from('baseline'), () => 0);
  assert.equal(out.status, 'match');
});

test('reports a difference when the captured bytes differ', () => {
  const dir = fixtureDir();
  writeFileSync(join(dir, 'login.png'), Buffer.from('baseline'));
  const out = compareOrSeed(dir, 'login', Buffer.from('actual'), () => 812);
  assert.equal(out.status, 'diff');
  assert.equal(out.diffPixels, 812);
});
