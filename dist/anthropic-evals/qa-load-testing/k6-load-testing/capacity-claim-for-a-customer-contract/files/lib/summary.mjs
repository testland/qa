export function metricValues(summary, name) {
  const m = summary?.metrics?.[name];
  return m ? { type: m.type, ...m.values } : null;
}

export function thresholdResults(summary) {
  const out = [];
  for (const [metric, m] of Object.entries(summary?.metrics ?? {})) {
    for (const [expr, result] of Object.entries(m.thresholds ?? {})) {
      out.push({ metric, expression: expr, ok: result.ok === true });
    }
  }
  return out;
}

export function stat(summary, name, key) {
  const v = metricValues(summary, name);
  return v && key in v ? v[key] : null;
}
