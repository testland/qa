export function share(part, total) {
  if (total <= 0) throw new RangeError('total must be positive');
  return Math.round((part / total) * 1000) / 10;
}

export function countFor(sharePct, total) {
  if (sharePct < 0 || sharePct > 100) throw new RangeError('share must be 0-100');
  return Math.round((sharePct / 100) * total);
}
