// Contract-signing step: the signer draws their signature with a pointer.
export function createSignaturePad(surface) {
  const strokes = [];
  let current = null;

  surface.onPointerDown = (e) => {
    current = [{ x: e.x, y: e.y, t: e.t }];
  };

  surface.onPointerMove = (e) => {
    if (!current) return;
    current.push({ x: e.x, y: e.y, t: e.t });
  };

  surface.onPointerUp = () => {
    if (current && current.length > 1) strokes.push(current);
    current = null;
  };

  return {
    strokes,
    clear() {
      strokes.length = 0;
    },
    isEmpty() {
      return strokes.length === 0;
    },
  };
}
