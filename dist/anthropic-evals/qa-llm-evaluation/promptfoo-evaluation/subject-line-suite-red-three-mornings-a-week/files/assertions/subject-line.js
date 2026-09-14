const COMPETITORS = ['Mailwave', 'Blastly', 'Postroom'];

function envelope(output) {
  return JSON.parse(typeof output === 'string' ? output : JSON.stringify(output));
}

export function envelopeShape(output) {
  const o = envelope(output);
  const keys = Object.keys(o).sort();
  if (keys.length !== 2 || keys[0] !== 'preheader' || keys[1] !== 'subject') return false;
  return typeof o.subject === 'string' && typeof o.preheader === 'string';
}

export function underSixtyChars(output) {
  return envelope(output).subject.length <= 60;
}

export function noCompetitorNames(output) {
  const o = envelope(output);
  const text = (o.subject + ' ' + o.preheader).toLowerCase();
  return !COMPETITORS.some((c) => text.includes(c.toLowerCase()));
}
