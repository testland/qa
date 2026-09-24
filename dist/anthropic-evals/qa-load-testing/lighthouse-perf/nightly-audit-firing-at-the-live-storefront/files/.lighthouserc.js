module.exports = {
  ci: {
    collect: {
      url: [
        'https://shop.fernbrook.com/',
        'https://shop.fernbrook.com/c/kitchen',
        'https://shop.fernbrook.com/p/stoneware-mug-4pk',
      ],
      numberOfRuns: 5,
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
            'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
          },
        },
        {
          matchingUrlPattern: '^https://shop\.fernbrook\.com/c/',
          assertions: {
            'largest-contentful-paint': ['error', { maxNumericValue: 2200 }],
            'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
          },
        },
        {
          matchingUrlPattern: '^https://shop\.fernbrook\.com/p/',
          assertions: {
            'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
            'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
          },
        },
      ],
    },
    upload: { target: 'temporary-public-storage' },
  },
};
