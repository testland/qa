'use strict';

const DIRECTORY = {
  'u-1': { id: 'u-1', name: 'Ada', team: 'platform' },
  'u-2': { id: 'u-2', name: 'Grace', team: 'platform' },
  'u-3': { id: 'u-3', name: 'Katherine', team: 'billing' },
  'u-4': { id: 'u-4', name: 'Dorothy', team: 'billing' },
};

// Per-record lookup latency. A cold record costs an extra round trip.
const BASE_LATENCY = { 'u-1': 20, 'u-2': 55, 'u-3': 90, 'u-4': 125 };

function loadProfile(id) {
  const cold = Math.random() < 0.06;
  return new Promise((resolve) => {
    setTimeout(
      () => resolve({ ...DIRECTORY[id] }),
      BASE_LATENCY[id] + (cold ? 50 : 0)
    );
  });
}

// Looks the ids up concurrently. Results are collected as each lookup
// finishes; the returned list is not ordered by the ids that were requested.
async function loadProfiles(ids) {
  const found = [];
  await Promise.all(
    ids.map(async (id) => {
      found.push(await loadProfile(id));
    })
  );
  return found;
}

module.exports = { loadProfiles };
