import test from 'node:test';
import assert from 'node:assert/strict';
import { createSwitcher, renderSwitcher } from '../src/workspaces.js';

test('every workspace is its own tab stop', () => {
  const rendered = renderSwitcher(createSwitcher('acme'));
  assert.equal(rendered.items.length, 6);
  assert.ok(rendered.items.every((i) => i.tabindex === undefined));
});

test('each workspace entry points at that workspace', () => {
  const rendered = renderSwitcher(createSwitcher('acme'));
  assert.equal(rendered.items[0].tag, 'a');
  assert.equal(rendered.items[0].href, '/w/acme');
  assert.equal(rendered.items[5].href, '/w/foxglove');
});

test('exactly one workspace is marked as the one you are in', () => {
  const rendered = renderSwitcher(createSwitcher('delta'));
  const marked = rendered.items.filter((i) => i['aria-selected'] === 'true');
  assert.equal(marked.length, 1);
  assert.equal(marked[0].id, 'ws-delta');
});
