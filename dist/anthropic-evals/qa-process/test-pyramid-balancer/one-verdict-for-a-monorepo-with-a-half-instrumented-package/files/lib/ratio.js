export function pct(part, total) {
  if (!Number.isFinite(part) || !Number.isFinite(total)) return null;
  if (total <= 0) return null;
  return Math.round((part / total) * 1000) / 10;
}

export function totalCases(layers) {
  return Object.values(layers).reduce((sum, l) => sum + (l.cases ?? 0), 0);
}
