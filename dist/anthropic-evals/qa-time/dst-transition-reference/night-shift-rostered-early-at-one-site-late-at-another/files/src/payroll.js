'use strict';

const { nightShifts } = require('./shiftPlan.js');

const RATES = { 'nyc-1': 31.5, 'ldn-2': 24, 'lhi-4': 38, 'blr-3': 9.75 };

// One line of the fortnightly export, per generated night shift.
function payrollRows(siteId, fromDate, days) {
  return nightShifts(siteId, fromDate, days).map((shift) => ({
    siteId: shift.siteId,
    night: shift.startLocal.slice(0, 10),
    hours: shift.paidHours,
    gross: Math.round(shift.paidHours * RATES[siteId] * 100) / 100,
  }));
}

module.exports = { payrollRows, RATES };
