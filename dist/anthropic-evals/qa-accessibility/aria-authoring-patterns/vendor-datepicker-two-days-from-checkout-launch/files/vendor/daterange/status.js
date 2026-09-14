export function statusFor(nights) {
  if (!nights) return { hidden: true, text: '' };
  return { hidden: false, text: nights + (nights === 1 ? ' night selected' : ' nights selected') };
}
