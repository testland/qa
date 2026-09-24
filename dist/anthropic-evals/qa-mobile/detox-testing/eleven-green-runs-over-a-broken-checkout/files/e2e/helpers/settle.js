// Added on branch marcus/stabilise-e2e. Suite is much steadier with this after
// every tap. Roll out to the remaining spec files before 1.9.0.
const SETTLE_MS = 3000;

async function settle(ms = SETTLE_MS) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { settle, SETTLE_MS };
