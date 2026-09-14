'use strict';

function toMarkdownTable(rows, columns) {
  const header = `| ${columns.join(' | ')} |`;
  const rule = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((r) => `| ${columns.map((c) => String(r[c] ?? '')).join(' | ')} |`);
  return [header, rule, ...body].join('\n');
}

module.exports = { toMarkdownTable };
