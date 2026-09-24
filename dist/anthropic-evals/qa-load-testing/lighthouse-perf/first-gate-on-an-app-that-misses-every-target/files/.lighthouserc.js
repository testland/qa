// TODO(marek): fill the remaining routes from perf/baseline.csv - same shape as home
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:5173/',
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'mobile',
        chromeFlags: '--no-sandbox',
      },
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'preview ready',
    },
    assert: {
      assertMatrix: [
        {
          matchingUrlPattern: 'localhost:5173/$',
          assertions: {
            'largest-contentful-paint': ['error', { maxNumericValue: 1.9 }],
            'total-blocking-time': ['error', { maxNumericValue: 120 }],
            'cumulative-layout-shift': ['error', { maxNumericValue: 0.02 }],
          },
        },
      ],
    },
    upload: { target: 'temporary-public-storage' },
  },
};
