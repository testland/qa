export function clampZoom(z) {
  return Math.min(400, Math.max(25, z));
}

export function clampPan(offset, canvasSize, viewportSize) {
  const max = Math.max(0, canvasSize - viewportSize);
  return Math.min(max, Math.max(0, offset));
}
