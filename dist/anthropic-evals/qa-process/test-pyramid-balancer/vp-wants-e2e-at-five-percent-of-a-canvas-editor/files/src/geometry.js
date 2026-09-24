export function snapDistance(offset, grid) {
  return Math.round(offset / grid) * grid;
}

export function boundingBox(rects) {
  if (rects.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.w));
  const bottom = Math.max(...rects.map((r) => r.y + r.h));
  return { x, y, w: right - x, h: bottom - y };
}

export function rotatedArea(box, degrees) {
  const rad = (degrees * Math.PI) / 180;
  const w = Math.abs(box.w * Math.cos(rad)) + Math.abs(box.h * Math.sin(rad));
  const h = Math.abs(box.w * Math.sin(rad)) + Math.abs(box.h * Math.cos(rad));
  return Math.round(w * h);
}

export function areaOf(rooms) {
  return rooms.reduce((sum, r) => sum + r.w * r.h, 0);
}
