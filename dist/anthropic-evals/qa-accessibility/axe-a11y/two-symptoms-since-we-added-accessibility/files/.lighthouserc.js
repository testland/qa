const { collectUrls } = require('./lib/urls.js');

module.exports = {
  ci: {
    collect: {
      url: collectUrls('http://localhost:3000'),
      numberOfRuns: 3,
      startServerCommand: 'npm run start',
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.85 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
      },
      assertMatrix: [
        {
          matchingUrlPattern: '.*',
          assertions: {
            'categories:accessibility': ['error', { minScore: 0.9 }],
          },
        },
        {
          matchingUrlPattern: '.*/checkout.*',
          assertions: {
            'categories:accessibility': ['error', { minScore: 0.98 }],
          },
        },
      ],
    },
    upload: { target: 'temporary-public-storage' },
  },
};
