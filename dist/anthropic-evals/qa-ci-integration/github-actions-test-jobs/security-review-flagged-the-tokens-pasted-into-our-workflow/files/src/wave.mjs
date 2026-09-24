export function parseDuration(text) {
  const m = /^(\d+)(ms|s|m|h)$/.exec(text.trim());
  if (!m) throw new SyntaxError(`not a duration: ${text}`);
  const unit = { ms: 1, s: 1000, m: 60000, h: 3600000 }[m[2]];
  return Number(m[1]) * unit;
}

export function formatDuration(ms) {
  if (ms % 3600000 === 0) return `${ms / 3600000}h`;
  if (ms % 60000 === 0) return `${ms / 60000}m`;
  if (ms % 1000 === 0) return `${ms / 1000}s`;
  return `${ms}ms`;
}
