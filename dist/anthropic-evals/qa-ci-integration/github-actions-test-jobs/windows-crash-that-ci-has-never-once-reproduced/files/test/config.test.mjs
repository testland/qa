import test from 'node:test';
import assert from 'node:assert/strict';
import { configPath, cachePath } from '../src/config.mjs';

test('resolves the config path', () => {
  assert.equal(configPath('/srv/acme'), '/srv/acme/config/app.json');
});

test('resolves the cache path', () => {
  assert.equal(cachePath('/srv/acme'), '/srv/acme/.acme-sync/cache');
});

test('a trailing separator does not double up', () => {
  assert.ok(!configPath('/srv/acme').includes('//'));
});
