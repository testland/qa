import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSummary, toMs } from '../lib/k6-log.mjs';

const SAMPLE = [
  '   ✓ http_req_duration..............: avg=210ms  min=90ms   med=180ms  max=2s     p(90)=390ms  p(95)=480ms',
  '     http_reqs......................: 1200   40.00/s',
  '     vus_max........................: 25     min=25      max=25',
  '',
  'running (0m30.1s), 00/25 VUs, 1200 complete and 0 interrupted iterations',
].join('\n');

test('reads metric lines, their threshold mark and their values', () => {
  const { metrics } = parseSummary(SAMPLE);
  assert.equal(metrics.http_req_duration.mark, '✓');
  assert.equal(metrics.http_req_duration.values['p(95)'], '480ms');
  assert.equal(metrics.vus_max.values.max, '25');
  assert.equal(metrics.http_reqs.raw, '1200   40.00/s');
});

test('reads the trailing run line', () => {
  const { running } = parseSummary(SAMPLE);
  assert.equal(running.maxVus, 25);
  assert.equal(running.complete, 1200);
  assert.equal(running.durationMs, 30100);
});

test('converts k6 duration strings to milliseconds', () => {
  assert.equal(toMs('6.83s'), 6830);
  assert.equal(toMs('142ms'), 142);
  assert.equal(toMs('3m00.2s'), 180200);
  assert.equal(toMs('0s'), 0);
});
