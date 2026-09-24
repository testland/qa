'use strict';

const records = [];

function reset() {
  records.length = 0;
}

function isOptedOut(req) {
  const cookies = req.cookies || {};
  return cookies['do-not-sell'] === '1';
}

function submitOptOutForm(req) {
  records.push({ visitorId: req.visitorId, method: 'banner-form', at: req.at });
  return { setCookie: { 'do-not-sell': '1' } };
}

function recordsFor(visitorId) {
  return records.filter((r) => r.visitorId === visitorId);
}

module.exports = { reset, isOptedOut, submitOptOutForm, recordsFor };
