export function summarise(report) {
  const counts = { passed: 0, failed: 0, skipped: 0, other: 0 };
  for (const suite of report.suites ?? []) {
    for (const spec of suite.specs ?? []) {
      const status = spec.status ?? 'other';
      if (status in counts) counts[status] += 1;
      else counts.other += 1;
    }
  }
  return counts;
}

export function isGreen(counts) {
  return counts.failed === 0 && counts.passed > 0;
}
