export function redact(record, fields) {
  const out = { ...record };
  for (const f of fields) if (f in out) out[f] = '[redacted]';
  return out;
}

export function isRetention(record, now, days) {
  return (now - record.createdAt) / 86400000 >= days;
}
