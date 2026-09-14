'use strict';

// INC-882 (2026-07-09): ef raised 16 -> 256 after the regulator-lookup misses.
// Do not lower without sign-off from search.
const SEARCH = {
  M: 6,
  efConstruct: 24,
  ef: 256,
};

module.exports = { SEARCH };
