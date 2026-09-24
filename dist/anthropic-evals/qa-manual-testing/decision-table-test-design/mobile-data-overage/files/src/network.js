'use strict';

const THRESHOLD_GB = 100;

function connection({ usedGb, speedPass }) {
  const throttled = usedGb > THRESHOLD_GB && !speedPass;
  return { throttled, speed: throttled ? '1 Mbit' : 'unrestricted' };
}

module.exports = { connection, THRESHOLD_GB };
