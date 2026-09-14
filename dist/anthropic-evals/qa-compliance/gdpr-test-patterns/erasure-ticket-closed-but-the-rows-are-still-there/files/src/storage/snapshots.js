'use strict';

const RETENTION_DAYS = 35;
const DAY_MS = 86400000;
const snapshots = [];

function take(id, createdAt, subjects) {
  return Object.freeze({
    id,
    createdAt,
    expiresAt: new Date(Date.parse(createdAt) + RETENTION_DAYS * DAY_MS).toISOString(),
    subjects: Object.freeze([...subjects]),
  });
}

function seed() {
  snapshots.length = 0;
  snapshots.push(
    take('snap_2026_05_01', '2026-05-01T02:00:00Z', ['nina.abel@example.net', 'omar.kade@example.net']),
    take('snap_2026_05_15', '2026-05-15T02:00:00Z', ['nina.abel@example.net', 'omar.kade@example.net']),
  );
}

function containing(email) {
  return snapshots.filter((s) => s.subjects.includes(email));
}

seed();

module.exports = { RETENTION_DAYS, seed, containing };
