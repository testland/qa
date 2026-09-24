'use strict';

const STATES = ['pending', 'verified', 'restricted', 'closed'];

function canReceivePayouts(merchant) {
  return merchant.state === 'verified' && merchant.holds.length === 0;
}

function transition(merchant, next) {
  if (!STATES.includes(next)) throw new Error(`unknown state: ${next}`);
  if (merchant.state === 'closed') throw new Error('closed merchants cannot transition');
  return { ...merchant, state: next };
}

module.exports = { canReceivePayouts, transition, STATES };
