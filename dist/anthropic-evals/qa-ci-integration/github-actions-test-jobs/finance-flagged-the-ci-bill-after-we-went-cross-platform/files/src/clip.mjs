export function clamp(value, lo, hi) {
  if (lo > hi) throw new RangeError('lo must not exceed hi');
  return Math.min(Math.max(value, lo), hi);
}

export function chunk(items, size) {
  if (!Number.isInteger(size) || size < 1) throw new RangeError('size must be a positive integer');
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
