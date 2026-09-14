'use strict';

const eventSink = require('./pipeline/eventSink');

function purgeClosedActors(actorIds) {
  actorIds.forEach((id) => eventSink.deleteForActor(id));
  return { purged: actorIds.length };
}

module.exports = { purgeClosedActors };
