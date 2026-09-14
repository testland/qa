'use strict';

const { isOptedOut } = require('./optOut');
const vendors = require('./vendors');

const CORE_SCRIPTS = ['app.js', 'consent-banner.js'];
const SHARE_SCRIPTS = ['analytics-share.js', 'ads-third-party.js'];

function renderPage(req) {
  const scripts = [...CORE_SCRIPTS];
  if (!isOptedOut(req)) {
    scripts.push(...SHARE_SCRIPTS);
    SHARE_SCRIPTS.forEach((s) => vendors.recordShare(s.replace(/\.js$/, ''), req.visitorId, req.at));
  }
  return { status: 200, scripts };
}

module.exports = { renderPage, CORE_SCRIPTS, SHARE_SCRIPTS };
