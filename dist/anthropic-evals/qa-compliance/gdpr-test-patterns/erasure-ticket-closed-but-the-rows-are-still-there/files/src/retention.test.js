'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const eventSink = require('./pipeline/eventSink');
const { purgeClosedActors } = require('./retention');

test('a purge drops every pipeline row for the listed actors', () => {
  eventSink.seed();
  const result = purgeClosedActors(['u_402']);
  assert.equal(result.purged, 1);
  assert.equal(eventSink.eventsForActor('u_402').length, 0);
  assert.equal(eventSink.eventsForActor('u_401').length, 2);
});
