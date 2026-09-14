module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:4173/',
        'http://localhost:4173/search',
        'http://localhost:4173/listing/8812',
      ],
      numberOfRuns: 1,
      settings: {
        preset: 'desktop',
        chromeFlags: '--no-sandbox',
      },
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'preview ready',
    },
    assert: {
      assertions: {
        'largest-contentful-paint': ['error', { maxNumericValue: 4000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.25 }],
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
};
