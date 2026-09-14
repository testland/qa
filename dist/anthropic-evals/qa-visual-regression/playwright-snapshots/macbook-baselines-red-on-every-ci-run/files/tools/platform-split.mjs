// Splits a list of committed baseline paths by the trailing platform segment.
// Reporting helper only - it does not read, write or delete any PNG.

const NAME = /-(chromium|firefox|webkit)-(darwin|linux|win32)\.png$/;

export function splitByPlatform(paths) {
  const out = { darwin: [], linux: [], win32: [], unrecognized: [] };
  for (const p of paths) {
    const m = NAME.exec(p);
    if (!m) out.unrecognized.push(p);
    else out[m[2]].push(p);
  }
  return out;
}

export function countsByPlatform(paths) {
  const split = splitByPlatform(paths);
  return Object.fromEntries(Object.entries(split).map(([k, v]) => [k, v.length]));
}
