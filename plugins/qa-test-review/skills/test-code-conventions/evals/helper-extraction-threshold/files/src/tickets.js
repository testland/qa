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
