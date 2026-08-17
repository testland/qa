export function delaysFor(attempts, baseDelayMs) {
  return Array.from(
    { length: Math.max(0, attempts - 1) },
    (_, index) => baseDelayMs * 2 ** index,
  );
}
