export function quoteCents(weightGrams, zone) {
  if (weightGrams <= 0) throw new RangeError('weight must be positive');
  const base = { A: 450, B: 620, C: 890 }[zone];
  if (base === undefined) throw new RangeError('unknown zone ' + zone);
  return base + Math.ceil(weightGrams / 500) * 35;
}

export function zoneFor(distanceKm) {
  if (distanceKm < 0) throw new RangeError('distance must be non-negative');
  if (distanceKm <= 50) return 'A';
  if (distanceKm <= 400) return 'B';
  return 'C';
}

export function etaMinutes(distanceKm, stops) {
  return Math.round(distanceKm * 1.6) + stops * 7;
}

export function checkDigit(body) {
  const digits = [...body].map(Number);
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10;
}

export function signWebhook(payload, secret) {
  let h = 2166136261;
  for (const ch of secret + ':' + payload) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
