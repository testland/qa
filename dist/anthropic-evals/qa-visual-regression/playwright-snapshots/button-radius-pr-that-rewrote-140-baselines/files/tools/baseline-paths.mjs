// Groups a `git diff --name-status` listing by the spec directory a baseline
// belongs to. Reporting helper only - it does not read or write PNGs.

export function parseNameStatus(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[A-Z]\t?\s/.test(line) || /^[A-Z]\s+\S/.test(line))
    .map((line) => {
      const [status, path] = line.split(/\s+/, 2);
      return { status, path };
    })
    .filter((e) => e.path && e.path.endsWith('.png'));
}

export function groupBySpecDir(entries) {
  const out = new Map();
  for (const e of entries) {
    const dir = e.path.split('/').slice(0, -1).join('/');
    if (!out.has(dir)) out.set(dir, []);
    out.get(dir).push(e);
  }
  return out;
}
