'use strict';

const LANE_RE = /^([A-Z]{3})-([A-Z]{3})$/;

function parseLane(code) {
  const m = LANE_RE.exec(code);
  if (!m) throw new Error(`bad lane code: ${code}`);
  return { origin: m[1], destination: m[2] };
}

function isDomestic(code, homePrefixes) {
  const { origin, destination } = parseLane(code);
  return homePrefixes.includes(origin) && homePrefixes.includes(destination);
}

module.exports = { parseLane, isDomestic };
