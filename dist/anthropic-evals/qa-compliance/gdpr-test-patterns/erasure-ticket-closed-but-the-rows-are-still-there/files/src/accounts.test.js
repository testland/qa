'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { db, seed, userByEmail } = require('./db');
const eventSink = require('./pipeline/eventSink');
const hubsync = require('./integrations/hubsync');
const accounts = require('./accounts');

const AT = '2026-05-20T10:00:00Z';

function fresh() {
  seed();
  eventSink.seed();
  hubsync.seed();
}

test('a signup lands in the account table and the pipeline', () => {
  fresh();
  const user = accounts.signup({ email: 'ines.roy@example.net', displayName: 'I. Roy', country: 'BE', at: AT });
  assert.equal(db.users.length, 3);
  assert.equal(eventSink.eventsForActor(user.id).length, 1);
  assert.equal(hubsync.contactsFor('ines.roy@example.net').length, 1);
});

test('a ticket is filed against the requester', () => {
  fresh();
  accounts.openTicket({ requesterEmail: 'omar.kade@example.net', body: 'Card declined', at: AT });
  assert.equal(db.supportTickets.filter((t) => t.requesterEmail === 'omar.kade@example.net').length, 2);
  assert.equal(eventSink.eventsForActor('u_402').length, 2);
});

test('closing an account tells the CRM to drop the contact', () => {
  fresh();
  const result = accounts.closeAccount({ email: 'omar.kade@example.net', at: AT });
  assert.equal(result.status, 'closed');
  assert.equal(userByEmail('omar.kade@example.net').status, 'closed');
  assert.equal(hubsync.contactsFor('omar.kade@example.net').length, 0);
  assert.equal(hubsync.deletionRequestsFor('omar.kade@example.net').length, 1);
});
