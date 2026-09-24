// Vertical-band geometry only: every overlay on this page is full-bleed.
export function overlapReport(target, overlays) {
  const height = target.bottom - target.top;
  const hits = overlays.filter((o) => o.bottom > target.top && o.top < target.bottom);

  const bands = hits
    .map((o) => [Math.max(o.top, target.top), Math.min(o.bottom, target.bottom)])
    .sort((a, b) => a[0] - b[0]);

  let coveredPx = 0;
  let cursor = target.top;
  for (const [start, end] of bands) {
    if (end <= cursor) continue;
    coveredPx += end - Math.max(start, cursor);
    cursor = end;
  }

  return {
    height,
    coveredPx,
    visiblePx: height - coveredPx,
    by: hits.map((o) => o.id),
  };
}
