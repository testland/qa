const BASE_DELAY_MS = 200;
const MAX_RETRIES = 3;

function delayForAttempt(attempt) {
  return BASE_DELAY_MS * Math.pow(2, attempt);
}

module.exports = { delayForAttempt, BASE_DELAY_MS, MAX_RETRIES };
