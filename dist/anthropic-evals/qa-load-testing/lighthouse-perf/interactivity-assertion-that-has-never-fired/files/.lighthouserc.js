const profile = process.env.LH_PROFILE === 'mobile' ? 'mobile' : 'desktop';

const shared = {
  'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
  'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
};

const mobileOnly = {
  'total-blocking-time': ['error', { maxNumericValue: 300 }],
  'cumulative-layout-shift': ['error', { maxNumericValue: 0.05 }],
};

module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:8080/',
        'http://localhost:8080/search',
        'http://localhost:8080/book/step-1',
      ],
      numberOfRuns: 3,
      settings: {
        preset: profile,
        chromeFlags: '--no-sandbox',
      },
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'preview ready',
    },
    assert: {
      assertions: profile === 'mobile' ? { ...shared, ...mobileOnly } : shared,
    },
    upload: { target: 'temporary-public-storage' },
  },
};
