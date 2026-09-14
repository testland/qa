// staging job, retired 2026-05-14
module.exports = {
  ci: {
    collect: {
      url: [
        'https://staging.fernbrook.internal/',
        'https://staging.fernbrook.internal/c/kitchen',
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        chromeFlags: '--no-sandbox',
      },
    },
    assert: {
      assertMatrix: [
        {
          matchingUrlPattern: '^https://shop\.fernbrook\.com/$',
          assertions: {
            'largest-contentful-paint': ['error', { maxNumericValue: 1800 }],
          },
        },
        {
          matchingUrlPattern: '^https://shop\.fernbrook\.com/c/',
          assertions: {
            'largest-contentful-paint': ['error', { maxNumericValue: 2200 }],
          },
        },
      ],
    },
    upload: { target: 'temporary-public-storage' },
  },
};
