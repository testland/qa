'use strict';

// All amounts are whole cents.
//   dailyCapCents:    1000 to 100000, both endpoints included.
//   totalBudgetCents: at least dailyCapCents, at most 10000000, both
//                     endpoints included. Its floor is not a constant - it is
//                     whatever dailyCapCents is on the same request.
const MIN_DAILY_CAP = 1000;
const MAX_DAILY_CAP = 100000;
const MAX_TOTAL_BUDGET = 10000000;

function validateCampaign(input) {
  if (!input || typeof input !== 'object') {
    return { ok: false, code: 'MALFORMED' };
  }
  const { dailyCapCents, totalBudgetCents } = input;
  if (!Number.isInteger(dailyCapCents)) {
    return { ok: false, code: 'DAILY_CAP_NOT_INTEGER' };
  }
  if (!Number.isInteger(totalBudgetCents)) {
    return { ok: false, code: 'TOTAL_BUDGET_NOT_INTEGER' };
  }
  if (dailyCapCents < MIN_DAILY_CAP) {
    return { ok: false, code: 'DAILY_CAP_TOO_LOW' };
  }
  if (dailyCapCents > MAX_DAILY_CAP) {
    return { ok: false, code: 'DAILY_CAP_TOO_HIGH' };
  }
  if (totalBudgetCents < dailyCapCents) {
    return { ok: false, code: 'TOTAL_BELOW_DAILY_CAP' };
  }
  if (totalBudgetCents > MAX_TOTAL_BUDGET) {
    return { ok: false, code: 'TOTAL_BUDGET_TOO_HIGH' };
  }
  return { ok: true, code: null };
}

module.exports = {
  validateCampaign,
  MIN_DAILY_CAP,
  MAX_DAILY_CAP,
  MAX_TOTAL_BUDGET,
};
