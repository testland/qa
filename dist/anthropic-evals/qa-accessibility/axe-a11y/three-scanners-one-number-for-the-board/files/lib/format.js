export function pct(n) {
  return `${Math.round(n)}%`;
}

export function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}
