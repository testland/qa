// Collect-only since 2026-06-18. No assertions yet — that is the open work.
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:4000/',
        'http://localhost:4000/pricing',
        'http://localhost:4000/app/dashboard',
        'http://localhost:4000/app/reports',
        'http://localhost:4000/app/invoices/new',
        'http://localhost:4000/share/9f2c1ad4',
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        chromeFlags: '--no-sandbox',
      },
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'listening on',
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
