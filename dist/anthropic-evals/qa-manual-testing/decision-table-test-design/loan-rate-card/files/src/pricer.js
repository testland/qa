'use strict';

const BASE_APR = 9.9;

function round1(n) {
  return Math.round(n * 10) / 10;
}

function priceApr(application) {
  const { creditScore, termMonths, holdsCurrentAccount, amountEur } = application;
  let apr = BASE_APR;

  if (creditScore >= 780) apr -= 2.5;
  else if (creditScore >= 700) apr -= 1.5;

  if (termMonths > 60) apr += 0.8;
  if (holdsCurrentAccount) apr -= 0.3;
  if (amountEur >= 25000) apr -= 0.4;

  return {
    aprPoints: round1(apr),
    referredToUnderwriting: creditScore < 700 && termMonths > 60,
  };
}

module.exports = { priceApr, BASE_APR };
