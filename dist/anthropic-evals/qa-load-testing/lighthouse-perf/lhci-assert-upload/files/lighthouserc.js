module.exports = {
  ci: {
    collect: {
      url: [
        'https://staging.example.com/',
        'https://staging.example.com/account?session=8f3a2c91e7',
      ],
      numberOfRuns: 1,
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
};
