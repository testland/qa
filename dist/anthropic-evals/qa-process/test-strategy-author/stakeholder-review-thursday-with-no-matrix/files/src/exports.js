export function buildExportRequest(savedQuery, destination) {
  if (!savedQuery.workspaceId) throw new Error('workspaceId required');
  if (!['s3', 'webhook'].includes(destination.kind)) {
    throw new Error(`unsupported destination ${destination.kind}`);
  }
  return {
    workspaceId: savedQuery.workspaceId,
    queryId: savedQuery.id,
    destination,
    format: destination.format ?? 'csv',
  };
}

export function parseQueryApiResponse(body) {
  if (typeof body.rowCount !== 'number') throw new Error('rowCount missing');
  if (!Array.isArray(body.rows)) throw new Error('rows missing');
  return { rowCount: body.rowCount, rows: body.rows };
}
