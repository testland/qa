'use strict';

// A snapshot of the outage window, pulled out of prod for the tests.
const SAMPLE = {
  settlements: {
    '2026-09-07': 4180233,
    '2026-09-08': 3992104,
    '2026-09-09': 4410770,
    '2026-09-10': 4077615,
  },
  overdue: {
    '2026-09-07': ['c-101', 'c-102'],
    '2026-09-08': ['c-101', 'c-102'],
    '2026-09-09': ['c-101', 'c-102'],
    '2026-09-10': ['c-101', 'c-102'],
  },
  facts: {
    '2026-09-07': 118204,
    '2026-09-08': 121553,
    '2026-09-09': 119870,
    '2026-09-10': 124011,
  },
  sessions: {
    's-1': Date.UTC(2026, 8, 9, 4, 0),
    's-2': Date.UTC(2026, 8, 10, 4, 0),
    's-3': Date.UTC(2026, 8, 11, 1, 0),
    's-4': Date.UTC(2026, 8, 12, 4, 0),
  },
};

// The worker binds the real adapters at boot; the tests bind these.
function createIo(seed = SAMPLE) {
  return {
    partner: {
      held: new Map(),
      calls: [],
      putFile(period, name) {
        this.calls.push({ period, name });
        if (this.held.has(period)) return { status: 409, period };
        this.held.set(period, name);
        return { status: 201, period };
      },
    },
    ledger: {
      entries: [],
      append(entry) {
        this.entries.push(entry);
        return this.entries.length;
      },
    },
    mailer: {
      sent: [],
      send(customer, subject) {
        this.sent.push({ customer, subject });
      },
    },
    warehouse: {
      writes: 0,
      partitions: new Map(),
      writePartition(period, rows) {
        this.writes += 1;
        this.partitions.set(period, rows);
      },
    },
    sessions: {
      live: new Map(Object.entries(seed.sessions || {})),
      deleteExpired(atMs) {
        let removed = 0;
        for (const [id, expiresAt] of this.live) {
          if (expiresAt <= atMs) {
            this.live.delete(id);
            removed += 1;
          }
        }
        return removed;
      },
    },
    settlementCents: (period) => (seed.settlements || {})[period] || 0,
    overdueOn: (period) => (seed.overdue || {})[period] || [],
    factsFor: (period) => (seed.facts || {})[period] || 0,
  };
}

module.exports = { createIo, SAMPLE };
