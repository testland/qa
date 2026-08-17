# The ticket tests have helpers nobody can reason about

## Problem Description

`src/tickets.test.js` grew a helper layer one commit at a time and nobody has
looked at it as a whole.

Four tests open with the same five lines of setup, copied verbatim. When the
ticket shape changed last sprint all four had to be edited by hand and one was
missed, which is how a stale note text ended up in the file for a month.

Two other tests call `setupAndEscalate(...)`. Reading either of those tests, we
cannot see what is being exercised - the body is one call and one check, and
the escalation the test is named for happens somewhere else. A reviewer asked
which of the two tests would fail if `escalate` stopped being called at all,
and nobody could answer without opening the helper.

Elsewhere in the same file there are helpers that are used once, and short
setups that are written out twice. Somebody needs to look at all of it and
decide, per helper, whether it earns its place.

## Output Specification

1. Rework `src/tickets.test.js` so that duplicated setup lives in one place and
   every test body still shows, on its own, what operation it exercises and
   from what starting state.
2. Every behaviour asserted today must still be asserted, and every helper you
   keep, add, or remove must be a decision you can defend - including any you
   deliberately leave duplicated.
3. Produce `helper-review.md` with one line per helper in the resulting file
   and per helper you removed, stating the rule you applied.

Do not change `src/tickets.js`.

Run `npm test` before you finish; it must pass.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "support-tickets",
  "version": "3.9.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/tickets.js ===============
'use strict';

const TARGET_MINUTES = { low: 2880, normal: 480, high: 120, urgent: 30 };

function createTicket({ id, priority, minutesOpen }) {
  return { id, priority, minutesOpen, assignee: null, escalated: false, notes: [] };
}

function addNote(ticket, note) {
  ticket.notes.push(note);
  return ticket;
}

function assign(ticket, agent) {
  ticket.assignee = agent;
  return ticket;
}

function breached(ticket) {
  return ticket.minutesOpen > TARGET_MINUTES[ticket.priority];
}

function escalate(ticket) {
  if (!breached(ticket)) {
    return false;
  }
  ticket.escalated = true;
  ticket.priority = ticket.priority === 'high' ? 'urgent' : 'high';
  return true;
}

module.exports = { createTicket, addNote, assign, breached, escalate };

=============== FILE: src/tickets.test.js ===============
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
