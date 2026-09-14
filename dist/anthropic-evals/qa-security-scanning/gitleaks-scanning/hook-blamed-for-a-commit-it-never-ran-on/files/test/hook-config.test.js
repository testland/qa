'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');

const cfg = fs.readFileSync('.pre-commit-config.yaml', 'utf8').replace(/\r/g, '');

test('the scanner hook is declared', () => {
  assert.match(cfg, /repo:\s*https:\/\/github\.com\/gitleaks\/gitleaks/);
  assert.match(cfg, /id:\s*gitleaks/);
});

test('the hook revision is pinned to a release tag, not a branch', () => {
  const rev = /rev:\s*(\S+)/.exec(cfg);
  assert.ok(rev, 'no rev: pin found');
  assert.match(rev[1], /^v\d+\.\d+\.\d+$/, 'rev must be a vX.Y.Z tag, got ' + rev[1]);
});
