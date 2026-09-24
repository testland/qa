export function parseDuration(text) {
  const m = /^(\d+)(ms|s|m|h)$/.exec(text.trim());
  if (!m) throw new SyntaxError(`not a duration: ${text}`);
  const unit = { ms: 1, s: 1000, m: 60000, h: 3600000 }[m[2]];
  return Number(m[1]) * unit;
}
