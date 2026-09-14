// Kestrel Digital, 2026-03-04. Nightly storefront audit.
module.exports = {
  ci: {
    collect: {
      url: [
        'https://www.northbrookoutfitters.com/',
        'https://www.northbrookoutfitters.com/collections/new-arrivals',
      ],
      numberOfRuns: 1,
      settings: {
        preset: 'desktop',
        chromeFlags: '--no-sandbox',
      },
    },
    assert: {
      assertions: {
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
