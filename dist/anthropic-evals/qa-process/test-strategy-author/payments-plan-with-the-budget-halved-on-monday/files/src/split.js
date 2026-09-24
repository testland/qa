export function splitAmount(totalCents, sharePercents) {
  const sum = sharePercents.reduce((a, b) => a + b, 0);
  if (sum !== 100) throw new Error('shares must sum to 100');
  return sharePercents.map((s) => Math.round((totalCents * s) / 100));
}
