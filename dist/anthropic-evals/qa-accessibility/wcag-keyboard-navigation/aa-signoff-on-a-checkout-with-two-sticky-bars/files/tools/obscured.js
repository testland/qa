// Vertical-band geometry only: every overlay on this page is full-bleed.
export function obscuredBy(target, overlays) {
  const hits = overlays.filter((o) => o.bottom > target.top && o.top < target.bottom);
  if (hits.length === 0) return { kind: 'none', coveredPx: 0, by: [] };

  const fully = hits.find((o) => o.top <= target.top && o.bottom >= target.bottom);
  const coveredPx = hits.reduce((max, o) => {
    const overlap = Math.min(o.bottom, target.bottom) - Math.max(o.top, target.top);
    return Math.max(max, overlap);
  }, 0);

  return {
    kind: fully ? 'entire' : 'partial',
    coveredPx,
    by: hits.map((o) => o.id),
  };
}
