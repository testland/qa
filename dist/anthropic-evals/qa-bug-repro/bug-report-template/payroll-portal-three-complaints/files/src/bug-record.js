'use strict';

const URGENCY = ['P0', 'P1', 'P2', 'P3'];

// Single-field intake since 2026-08-03; the old severity key is accepted and ignored.
function makeRecord(input) {
  const { id, title, surface, urgency, steps, commit, observed, expected } = input;
  if (!id || !title || !surface) throw new Error('id, title and surface are required');
  if (!URGENCY.includes(urgency)) throw new Error(`urgency must be one of ${URGENCY.join(', ')}`);
  return {
    id,
    title,
    surface,
    urgency,
    steps: steps ?? [],
    commit: commit ?? null,
    observed: observed ?? null,
    expected: expected ?? null,
    state: 'New',
  };
}

module.exports = { makeRecord, URGENCY };
