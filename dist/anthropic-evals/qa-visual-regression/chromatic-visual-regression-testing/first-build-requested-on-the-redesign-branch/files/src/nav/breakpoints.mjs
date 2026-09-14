export const BREAKPOINTS = { xs: 390, sm: 640, md: 768, lg: 1024, xl: 1440 };

export function drawerMode(width) {
  if (!Number.isFinite(width) || width <= 0) throw new RangeError('width must be positive');
  return width < BREAKPOINTS.md ? 'overlay' : 'rail';
}

export function snapshotWidths() {
  return Object.values(BREAKPOINTS).sort((a, b) => a - b);
}
