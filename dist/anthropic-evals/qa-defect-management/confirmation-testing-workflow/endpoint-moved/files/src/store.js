'use strict';

const WORKSPACES = {
  w_empty: { id: 'w_empty', name: 'Onboarding sandbox', projects: [] },
  w_2: {
    id: 'w_2',
    name: 'Atlas',
    projects: [
      { id: 'p_1', name: 'Alpha' },
      { id: 'p_2', name: 'Beta' },
    ],
  },
};

module.exports = { WORKSPACES };
