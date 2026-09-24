'use strict';

const NIGHT_PREMIUM_EUR = 4;

function weeklyTreatment(contract, week) {
  if (contract.salaried) {
    if ('unionMember' in contract) {
      throw new Error('unionMember is not a field on a salaried contract');
    }
    const accruals = [];
    if (week.hoursOver40 > 0) accruals.push('time-off-in-lieu-1x');
    if (week.publicHolidayWorked) accruals.push('day-in-lieu');
    return { basis: 'salaried', overtimeRate: null, holidayRate: null, nightPremiumEurPerHour: 0, accruals };
  }
  return {
    basis: 'hourly',
    overtimeRate: week.hoursOver40 > 0 ? 1.5 : null,
    holidayRate: week.publicHolidayWorked ? (contract.unionMember ? 2.5 : 2.0) : null,
    nightPremiumEurPerHour: week.nightShift ? NIGHT_PREMIUM_EUR : 0,
    accruals: [],
  };
}

module.exports = { weeklyTreatment, NIGHT_PREMIUM_EUR };
