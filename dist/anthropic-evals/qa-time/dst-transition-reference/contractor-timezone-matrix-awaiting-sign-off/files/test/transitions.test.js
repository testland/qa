'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { offsetMinutes } = require('../src/zone.js');

test('row 1 - New York observes the change', () => {
  assert.equal(offsetMinutes('America/New_York', '2026-06-15T12:00:00Z'), -240);
});

test('row 2 - London observes the change on the same dates as New York', () => {
  assert.equal(offsetMinutes('Europe/London', '2026-06-15T12:00:00Z'), 60);
});

test('row 3 - Sydney is on summer time in January', () => {
  assert.equal(offsetMinutes('Australia/Sydney', '2026-01-15T12:00:00Z'), 660);
});

test('row 4a - Cairo in January', () => {
  assert.equal(offsetMinutes('Africa/Cairo', '2026-01-15T12:00:00Z'), 120);
});

test('row 4b - Cairo ten months later is unchanged, so Egypt has no clock change', () => {
  assert.equal(offsetMinutes('Africa/Cairo', '2026-11-15T12:00:00Z'), 120);
});

test('row 5 - Lord Howe Island observes the same one-hour change as the mainland', () => {
  assert.equal(offsetMinutes('Australia/Lord_Howe', '2026-06-15T12:00:00Z'), 630);
});

test('row 6a - Ciudad Juarez is on summer time in July', () => {
  assert.equal(offsetMinutes('America/Ciudad_Juarez', '2026-07-15T12:00:00Z'), -360);
});

test('row 6b - Ciudad Juarez is on winter time in January', () => {
  assert.equal(offsetMinutes('America/Ciudad_Juarez', '2026-01-15T12:00:00Z'), -420);
});

test('row 6c - Mexico City is the same in July', () => {
  assert.equal(offsetMinutes('America/Mexico_City', '2026-07-15T12:00:00Z'), -360);
});

test('row 6d - Mexico City is the same in January', () => {
  assert.equal(offsetMinutes('America/Mexico_City', '2026-01-15T12:00:00Z'), -360);
});

test('row 7a - Kolkata in January', () => {
  assert.equal(offsetMinutes('Asia/Kolkata', '2026-01-15T12:00:00Z'), 330);
});

test('row 7b - Kolkata in July is identical, so India has no clock change', () => {
  assert.equal(offsetMinutes('Asia/Kolkata', '2026-07-15T12:00:00Z'), 330);
});

test('row 8 - Casablanca is on winter time in January', () => {
  assert.equal(offsetMinutes('Africa/Casablanca', '2026-01-15T12:00:00Z'), 60);
});
