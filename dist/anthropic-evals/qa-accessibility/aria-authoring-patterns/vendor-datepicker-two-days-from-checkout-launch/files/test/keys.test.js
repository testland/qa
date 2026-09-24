import test from 'node:test';
import assert from 'node:assert/strict';
import { handleKey, tabIndexFor } from '../vendor/daterange/keys.js';
import { statusFor } from '../vendor/daterange/status.js';

test('arrow keys move the focused day around the month', () => {
  assert.deepEqual(handleKey('ArrowRight', 'kst-cell-12'), { action: 'move', focus: 'kst-cell-13' });
  assert.deepEqual(handleKey('ArrowLeft', 'kst-cell-12'), { action: 'move', focus: 'kst-cell-11' });
  assert.deepEqual(handleKey('ArrowDown', 'kst-cell-12'), { action: 'move', focus: 'kst-cell-19' });
  assert.deepEqual(handleKey('ArrowUp', 'kst-cell-12'), { action: 'move', focus: 'kst-cell-5' });
});

test('Home and End jump to the ends of the week', () => {
  assert.deepEqual(handleKey('Home', 'kst-cell-16'), { action: 'move', focus: 'kst-cell-15' });
  assert.deepEqual(handleKey('End', 'kst-cell-16'), { action: 'move', focus: 'kst-cell-21' });
});

test('Enter and Space pick the focused day', () => {
  assert.deepEqual(handleKey('Enter', 'kst-cell-14'), { action: 'select', day: 14 });
  assert.deepEqual(handleKey(' ', 'kst-cell-14'), { action: 'select', day: 14 });
});

test('Escape closes the picker from anywhere', () => {
  assert.deepEqual(handleKey('Escape', 'kst-cell-14'), { action: 'close' });
  assert.deepEqual(handleKey('Escape', 'kst-apply'), { action: 'close' });
});

test('focus bookkeeping matches the rendered markup', () => {
  assert.equal(tabIndexFor(12, 12), '0');
  assert.equal(tabIndexFor(13, 12), '-1');
  assert.equal(tabIndexFor(16, 12), '-1');
});

test('the selection summary appears once there is a selection', () => {
  assert.deepEqual(statusFor(0), { hidden: true, text: '' });
  assert.deepEqual(statusFor(1), { hidden: false, text: '1 night selected' });
  assert.deepEqual(statusFor(3), { hidden: false, text: '3 nights selected' });
});
