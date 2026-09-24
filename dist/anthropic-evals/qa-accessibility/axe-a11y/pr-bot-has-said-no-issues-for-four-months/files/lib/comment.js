import { readFileSync } from 'node:fs';

export function renderComment(resultsPath) {
  const results = JSON.parse(readFileSync(resultsPath, 'utf8'));

  if (results.violations.length === 0) {
    return 'Accessibility: no issues found.';
  }

  const lines = results.violations.map(
    (v) => `- ${v.impact}: ${v.id} (${v.nodes.length} nodes)`,
  );
  return ['Accessibility: issues found.', ...lines].join('\n');
}
