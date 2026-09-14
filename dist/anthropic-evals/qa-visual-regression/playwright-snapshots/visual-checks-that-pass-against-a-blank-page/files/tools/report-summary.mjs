// Turns per-check results into the line the PR comment prints.
// Reporting helper only - it does not capture or compare images.

export function classify(result) {
  if (result.status === 'skipped') return 'not run';
  if (result.status === 'passed' && result.comparedAgainst == null) return 'no baseline';
  return result.status;
}

export function summaryLines(results) {
  return results.map((r) => `${r.name}: ${classify(r)}`);
}
