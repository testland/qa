// Renders a breakpoint matrix from normalized per-project result rows.
// Reporting helper only - it does not capture or compare images.

export function matrixRows(results) {
  const pages = [...new Set(results.map((r) => r.page))].sort();
  const projects = [...new Set(results.map((r) => r.project))];
  return pages.map((page) => ({
    page,
    cells: projects.map((project) => {
      const hit = results.find((r) => r.page === page && r.project === project);
      return { project, status: hit ? hit.status : 'missing' };
    }),
  }));
}

export function renderMatrix(rows) {
  return rows
    .map((r) => '| ' + r.page + ' | ' + r.cells.map((c) => c.status).join(' | ') + ' |')
    .join('\n');
}
