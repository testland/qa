export function delta(before, after) {
  return after - before;
}

export function attainment(plannedDelta, actualDelta) {
  if (plannedDelta === 0) return actualDelta === 0 ? 1 : null;
  return Math.round((actualDelta / plannedDelta) * 100) / 100;
}

export function pct(part, total) {
  if (total <= 0) return null;
  return Math.round((part / total) * 1000) / 10;
}
