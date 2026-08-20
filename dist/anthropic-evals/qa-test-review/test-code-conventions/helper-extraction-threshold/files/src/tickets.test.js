'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createTicket, addNote, assign, breached, escalate } = require('./tickets');

function setupAndEscalate(priority, minutesOpen) {
  const ticket = createTicket({ id: 'T-200', priority, minutesOpen });
  assign(ticket, 'agent-2');
  escalate(ticket);
  return ticket;
}

function urgentTicketPastTarget() {
  return createTicket({ id: 'T-300', priority: 'urgent', minutesOpen: 45 });
}

test('a normal ticket past its target is breached', () => {
  const ticket = createTicket({ id: 'T-100', priority: 'normal', minutesOpen: 481 });
  addNote(ticket, 'customer reported a failed import');
  addNote(ticket, 'first response sent');
  addNote(ticket, 'awaiting customer reply');
  assign(ticket, 'agent-7');

  assert.equal(breached(ticket), true);
});

test('escalating a breached normal ticket raises it to high', () => {
  const ticket = createTicket({ id: 'T-100', priority: 'normal', minutesOpen: 481 });
  addNote(ticket, 'customer reported a failed import');
  addNote(ticket, 'first response sent');
  addNote(ticket, 'awaiting customer reply');
  assign(ticket, 'agent-7');

  const raised = escalate(ticket);

  assert.equal(raised, true);
  assert.equal(ticket.priority, 'high');
  assert.equal(ticket.escalated, true);
});

test('escalating keeps the notes and the assignee', () => {
  const ticket = createTicket({ id: 'T-100', priority: 'normal', minutesOpen: 481 });
  addNote(ticket, 'customer reported a failed import');
  addNote(ticket, 'first response sent');
  addNote(ticket, 'awaiting customer reply');
  assign(ticket, 'agent-7');

  escalate(ticket);

  assert.equal(ticket.notes.length, 3);
  assert.equal(ticket.assignee, 'agent-7');
});

test('a second escalation reaches urgent', () => {
  const ticket = createTicket({ id: 'T-100', priority: 'normal', minutesOpen: 481 });
  addNote(ticket, 'customer reported a failed import');
  addNote(ticket, 'first response sent');
  addNote(ticket, 'awaiting customer reply');
  assign(ticket, 'agent-7');

  escalate(ticket);
  escalate(ticket);

  assert.equal(ticket.priority, 'urgent');
});

test('a breached high ticket becomes urgent', () => {
  const ticket = setupAndEscalate('high', 200);

  assert.equal(ticket.priority, 'urgent');
});

test('a ticket inside its target is not escalated', () => {
  const ticket = setupAndEscalate('low', 60);

  assert.equal(ticket.escalated, false);
});

test('an urgent ticket past its target is breached', () => {
  assert.equal(breached(urgentTicketPastTarget()), true);
});

test('a normal ticket inside its target is not breached', () => {
  const ticket = createTicket({ id: 'T-400', priority: 'normal', minutesOpen: 60 });

  assert.equal(breached(ticket), false);
});

test('assigning a ticket records the agent', () => {
  const ticket = createTicket({ id: 'T-401', priority: 'normal', minutesOpen: 60 });

  assign(ticket, 'agent-9');

  assert.equal(ticket.assignee, 'agent-9');
});
