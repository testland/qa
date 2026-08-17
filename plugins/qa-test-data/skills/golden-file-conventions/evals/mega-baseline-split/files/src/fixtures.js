'use strict';

const DATA = {
  workspace: { name: 'Acme', plan: 'team', seatsUsed: 7, seatsTotal: 10 },
  billing: { currentCents: 12000, projectedCents: 15000, includedCents: 10000 },
  activity: [
    { kind: 'document.created', actor: 'ada', target: 'Roadmap' },
    { kind: 'member.invited', actor: 'grace', target: 'lin@acme.test' },
  ],
};

module.exports = { DATA };
