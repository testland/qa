import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExportRequest, parseQueryApiResponse } from '../src/exports.js';

test('builds an s3 export request defaulting to csv', () => {
  const req = buildExportRequest({ id: 'q_1', workspaceId: 'ws_1' }, { kind: 's3', bucket: 'b' });
  assert.equal(req.format, 'csv');
});

test('rejects an unsupported destination', () => {
  assert.throws(
    () => buildExportRequest({ id: 'q_1', workspaceId: 'ws_1' }, { kind: 'ftp' }),
    /unsupported destination/,
  );
});

test('parses a query API response', () => {
  const out = parseQueryApiResponse({ rowCount: 2, rows: [[1], [2]] });
  assert.equal(out.rowCount, 2);
});

test('rejects a query API response missing rowCount', () => {
  assert.throws(() => parseQueryApiResponse({ rows: [] }), /rowCount missing/);
});
