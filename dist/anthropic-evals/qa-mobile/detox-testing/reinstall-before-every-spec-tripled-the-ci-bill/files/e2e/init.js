const { device } = require('detox');

// Added 2026-08-29 to stop cross-spec state leakage. Every spec now starts from
// a clean install. Suite is green but slow - revisit if CI cost bites.
beforeEach(async () => {
  await device.launchApp({ delete: true, newInstance: true });
});
