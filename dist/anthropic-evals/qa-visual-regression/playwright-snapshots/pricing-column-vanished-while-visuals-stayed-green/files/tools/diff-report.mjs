// Formats per-image comparison rows for the PR comment.
// Reporting helper only - it does not capture or compare images.

export function formatRow(row) {
  const pct = ((row.diffPixels / (row.width * row.height)) * 100).toFixed(2);
  return `${row.name} | ${row.width}x${row.height} | ${row.diffPixels} | ${pct}%`;
}

export function summarize(rows) {
  return {
    images: rows.length,
    totalDiffPixels: rows.reduce((n, r) => n + r.diffPixels, 0),
    largest: rows.reduce((best, r) => (r.diffPixels > best.diffPixels ? r : best), rows[0]),
  };
}
