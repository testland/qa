export function formatBytes(n) {
  if (!Number.isFinite(n) || n < 0) throw new RangeError('bytes must be non-negative');
  if (n < 1024) return n + ' B';
  const units = ['kB', 'MB', 'GB'];
  let value = n / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return value.toFixed(1) + ' ' + units[i];
}

export function formatMs(n) {
  if (!Number.isFinite(n) || n < 0) throw new RangeError('ms must be non-negative');
  return n < 1000 ? Math.round(n) + ' ms' : (n / 1000).toFixed(2) + ' s';
}
