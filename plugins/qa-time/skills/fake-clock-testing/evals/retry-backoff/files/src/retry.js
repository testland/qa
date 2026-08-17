const { delayForAttempt, MAX_RETRIES } = require('./backoff');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(operation) {
  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === MAX_RETRIES) {
        break;
      }
      await sleep(delayForAttempt(attempt));
    }
  }
  throw lastError;
}

module.exports = { withRetry };
