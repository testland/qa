import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { countErrors, verdict, MAX_ERRORS } from './gate.mjs';

const cleanRun = [
  '1757318400123,412,POST /v1/checkout,200,OK,checkout 1-1,text,true,,2481,612,120,120,https://staging.pay.example.com/v1/checkout,398,0,22',
  '1757318400557,388,GET /v1/cards,200,OK,cards 1-2,text,true,,1104,402,120,120,https://staging.pay.example.com/v1/cards,371,0,19',
  '1757318401004,205,GET /v1/balance,200,OK,balance 1-3,text,true,,612,388,120,120,https://staging.pay.example.com/v1/balance,201,0,17',
].join('\n');

const replay = readFileSync(
  new URL('../artifacts/replay-2026-09-08.jtl', import.meta.url),
  'utf8',
);

test('a clean run reports no errored samples', () => {
  assert.equal(countErrors(cleanRun), 0);
});

test('a clean run passes the gate', () => {
  assert.equal(verdict(cleanRun).ok, true);
});

test('the error budget is ten samples', () => {
  assert.equal(MAX_ERRORS, 10);
});

test('the 8 September replay passes the gate', () => {
  assert.equal(countErrors(replay), 0);
  assert.equal(verdict(replay).ok, true);
});
