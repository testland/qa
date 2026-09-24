import test from 'node:test';
import assert from 'node:assert/strict';
import { drawerMode, snapshotWidths, BREAKPOINTS } from '../src/nav/breakpoints.mjs';

test('390 is the narrowest supported width', () => {
  assert.equal(snapshotWidths()[0], 390);
  assert.equal(BREAKPOINTS.xs, 390);
});

test('the drawer overlays below the md breakpoint', () => {
  assert.equal(drawerMode(390), 'overlay');
  assert.equal(drawerMode(767), 'overlay');
});

test('the drawer becomes a rail at md and above', () => {
  assert.equal(drawerMode(768), 'rail');
  assert.equal(drawerMode(1440), 'rail');
});

test('rejects a nonsense width', () => {
  assert.throws(() => drawerMode(0), RangeError);
  assert.throws(() => drawerMode(NaN), RangeError);
});
