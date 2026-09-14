import test from 'node:test';
import assert from 'node:assert/strict';
import { verdict } from '../scripts/visual-gate.mjs';

test('a clean run passes', () => {
  assert.equal(verdict(0).ok, true);
});

test('a build with changes blocks', () => {
  assert.equal(verdict(1).ok, false);
});

test('a 4 does not block the pipeline', () => {
  assert.equal(verdict(4).ok, true);
});

test('a 21 does not block the pipeline', () => {
  assert.equal(verdict(21).ok, true);
});

test('an 11 does not block the pipeline', () => {
  assert.equal(verdict(11).ok, true);
});

test('a 201 does not block the pipeline', () => {
  assert.equal(verdict(201).ok, true);
});

test('an unknown code blocks', () => {
  assert.equal(verdict(137).ok, false);
});
