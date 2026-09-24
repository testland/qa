'use strict';

const events = [];

function seed() {
  events.length = 0;
  events.push(
    { id: 'ev_1', actorId: 'u_401', name: 'project.opened', at: '2026-05-02T09:11:00Z' },
    { id: 'ev_2', actorId: 'u_401', name: 'export.started', at: '2026-05-02T09:14:00Z' },
    { id: 'ev_3', actorId: 'u_402', name: 'project.opened', at: '2026-05-03T11:02:00Z' },
  );
}

function record(event) {
  events.push({ id: `ev_${events.length + 1}`, ...event });
}

function eventsForActor(actorId) {
  return events.filter((e) => e.actorId === actorId);
}

function deleteForActor(actorId) {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (events[i].actorId === actorId) events.splice(i, 1);
  }
}

seed();

module.exports = { seed, record, eventsForActor, deleteForActor };
