// Marisol, 2026-03-16. Per-route budgets for the portal.
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:4300/portal',
        'http://localhost:4300/portal/messages',
        'http://localhost:4300/appointments',
        'http://localhost:4300/appointments/new',
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        chromeFlags: '--no-sandbox',
      },
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'listening on',
    },
    assert: {
      assertMatrix: [
        {
          matchingUrlPattern: '^/portal$',
          assertions: {
            'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
            'interaction-to-next-paint': ['error', { maxNumericValue: 200 }],
            'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
          },
        },
        {
          matchingUrlPattern: '^/portal/messages$',
          assertions: {
            'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
            'interaction-to-next-paint': ['error', { maxNumericValue: 200 }],
            'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
          },
        },
        {
          matchingUrlPattern: '^/appointments(/new)?$',
          assertions: {
            'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
            'interaction-to-next-paint': ['error', { maxNumericValue: 200 }],
            'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
          },
        },
      ],
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
