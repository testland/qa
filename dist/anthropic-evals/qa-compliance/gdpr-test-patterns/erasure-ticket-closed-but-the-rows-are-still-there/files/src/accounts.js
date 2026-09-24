'use strict';

const { db, userByEmail } = require('./db');
const eventSink = require('./pipeline/eventSink');
const hubsync = require('./integrations/hubsync');

function signup({ email, displayName, country, at }) {
  const user = { id: `u_${db.users.length + 500}`, email, displayName, country, status: 'active' };
  db.users.push(user);
  eventSink.record({ actorId: user.id, name: 'account.created', at });
  hubsync.upsert({ email, fullName: displayName, lifecycle: 'trial' });
  return user;
}

function openTicket({ requesterEmail, body, at }) {
  const user = userByEmail(requesterEmail);
  const ticket = { id: `t_${db.supportTickets.length + 100}`, requesterEmail, body };
  db.supportTickets.push(ticket);
  if (user) eventSink.record({ actorId: user.id, name: 'ticket.opened', at });
  return ticket;
}

function chargeCard({ userEmail, amountCents }) {
  const record = { id: `inv_${db.billingRecords.length + 9100}`, userEmail, amountCents };
  db.billingRecords.push(record);
  return record;
}

function closeAccount({ email, at }) {
  const user = userByEmail(email);
  if (!user) return { status: 'not_found' };
  user.status = 'closed';
  hubsync.requestDeletion(email, at);
  return { status: 'closed', id: user.id };
}

module.exports = { signup, openTicket, chargeCard, closeAccount };
