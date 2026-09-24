'use strict';

const vendors = require('./vendors');

const CORE_SCRIPTS = ['embed.js'];
const SHARE_SCRIPTS = ['analytics-share.js', 'partner-audience.js'];

function renderEmbed(req) {
  const cookies = req.cookies || {};
  const scripts = [...CORE_SCRIPTS];
  if (cookies['do-not-sell'] !== '1') {
    scripts.push(...SHARE_SCRIPTS);
    SHARE_SCRIPTS.forEach((s) => vendors.recordShare(s.replace(/\.js$/, ''), req.visitorId, req.at));
  }
  return { status: 200, scripts };
}

module.exports = { renderEmbed, CORE_SCRIPTS, SHARE_SCRIPTS };
