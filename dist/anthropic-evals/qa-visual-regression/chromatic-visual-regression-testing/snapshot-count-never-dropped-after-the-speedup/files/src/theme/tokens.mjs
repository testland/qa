export const SCALE = [0, 2, 4, 8, 12, 16, 24, 32, 48, 64];

export function space(step) {
  if (!Number.isInteger(step) || step < 0 || step >= SCALE.length) {
    throw new RangeError(`space(${step}) is outside the scale`);
  }
  return `${SCALE[step]}px`;
}
