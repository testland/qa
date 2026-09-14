const MAX_AGE_SECONDS = 900;
const CLOCK_SKEW_SECONDS = 30;

function isExpired(issuedAtSeconds, nowSeconds) {
  return nowSeconds - issuedAtSeconds > MAX_AGE_SECONDS + CLOCK_SKEW_SECONDS;
}

function remainingSeconds(issuedAtSeconds, nowSeconds) {
  const left = MAX_AGE_SECONDS - (nowSeconds - issuedAtSeconds);
  return left > 0 ? left : 0;
}

function shouldRefresh(issuedAtSeconds, nowSeconds) {
  return remainingSeconds(issuedAtSeconds, nowSeconds) < MAX_AGE_SECONDS / 3;
}

module.exports = { isExpired, remainingSeconds, shouldRefresh, MAX_AGE_SECONDS };
