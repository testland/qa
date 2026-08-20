'use strict';

function buildCsv(rows) {
  const header = 'id,name';
  if (rows.length === 0) {
    return header;
  }
  return [header, ...rows.map((r) => `${r.id},${r.name}`)].join('\n');
}

function buildExport(workspace, format) {
  const rows = (workspace.projects || []).map((p) => ({ id: p.id, name: p.name }));
  if (format === 'csv') {
    return { contentType: 'text/csv', body: buildCsv(rows), rowCount: rows.length };
  }
  return {
    contentType: 'application/json',
    body: JSON.stringify(rows),
    rowCount: rows.length,
  };
}

module.exports = { buildCsv, buildExport };
