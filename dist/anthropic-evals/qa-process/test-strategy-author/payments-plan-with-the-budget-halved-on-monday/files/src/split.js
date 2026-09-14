export function splitAmount(totalCents, sharePercents) {
  const sum = sharePercents.reduce((a, b) => a + b, 0);
  if (sum !== 100) throw new Error('shares must sum to 100');
  const parts = sharePercents.map((s) => Math.floor((totalCents * s) / 100));
  const allocated = parts.reduce((a, b) => a + b, 0);
  parts[0] += totalCents - allocated;
  return parts;
}
