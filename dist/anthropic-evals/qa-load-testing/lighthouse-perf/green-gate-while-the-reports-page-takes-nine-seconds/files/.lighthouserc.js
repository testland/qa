module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/pricing',
        'http://localhost:3000/app/reports',
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        chromeFlags: '--no-sandbox',
      },
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'preview listening',
    },
    assert: {
      assertMatrix: [
        {
          matchingUrlPattern: 'localhost:3000/$',
          assertions: {
            'largest-contentful-paint': ['error', { maxNumericValue: 1500 }],
            'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
          },
        },
        {
          matchingUrlPattern: '/pricing',
          assertions: {
            'largest-contentful-paint': ['error', { maxNumericValue: 1500 }],
            'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
          },
        },
        {
          matchingUrlPattern: '/app/reports',
          assertions: {
            'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
            'total-blocking-time': ['error', { maxNumericValue: 300 }],
            'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
          },
        },
      ],
    },
    upload: { target: 'temporary-public-storage' },
  },
};
