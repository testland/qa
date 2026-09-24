const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');

const WORKFLOW = '.github/workflows/dependabot-automerge.yml';
const CONFIG = '.github/dependabot.yml';

test('auto-merge workflow still exists', () => {
  assert.ok(fs.existsSync(WORKFLOW), 'workflow file missing');
});

test('workflow reads update metadata before deciding', () => {
  assert.match(fs.readFileSync(WORKFLOW, 'utf8'), /dependabot\/fetch-metadata/);
});

test('workflow declares at least one job on a runner', () => {
  const src = fs.readFileSync(WORKFLOW, 'utf8');
  assert.match(src, /^jobs:/m);
  assert.match(src, /\n\s+runs-on:\s*\S+/);
});

test('neither file uses tab indentation', () => {
  for (const f of [WORKFLOW, CONFIG]) {
    assert.ok(!fs.readFileSync(f, 'utf8').includes('\t'), `${f} contains a tab`);
  }
});

test('update settings still declare schema version 2', () => {
  assert.match(fs.readFileSync(CONFIG, 'utf8'), /^version:\s*2\s*$/m);
});
