'use strict';

const { localToInstant } = require('./zoneTime.js');

const SHIFT_HOURS = 8;

const SITES = {
  'nyc-1': { zone: 'America/New_York', nightStart: '22:30', handover: '06:30' },
  'ldn-2': { zone: 'Europe/London', nightStart: '22:30', handover: '06:30' },
  'lhi-4': { zone: 'Australia/Lord_Howe', nightStart: '22:30', handover: '06:30' },
  'blr-3': { zone: 'Asia/Kolkata', nightStart: '22:30', handover: '06:30' },
};

function addDays(isoDate, n) {
  const d = new Date(isoDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// One night shift per calendar day, starting at the site's fixed local time.
function nightShifts(siteId, fromDate, days) {
  const site = SITES[siteId];
  const out = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(fromDate, i);
    const startLocal = date + 'T' + site.nightStart + ':00';
    const startsAt = localToInstant(startLocal, site.zone);
    out.push({
      siteId,
      zone: site.zone,
      startLocal,
      startsAt,
      endsAt: new Date(startsAt.getTime() + SHIFT_HOURS * 3600000),
      paidHours: SHIFT_HOURS,
    });
  }
  return out;
}

module.exports = { nightShifts, addDays, SITES, SHIFT_HOURS };
