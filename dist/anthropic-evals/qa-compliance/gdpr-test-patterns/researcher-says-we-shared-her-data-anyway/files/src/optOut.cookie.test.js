'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const optOut = require('./optOut');
const { renderPage } = require('./page');
const { renderEmbed } = require('./embed');

const VISITOR = { visitorId: 'v_8812', at: '2026-09-01T08:00:00Z' };

test('a visitor carrying the opt-out cookie gets no sharing scripts', () => {
  const res = renderPage({ ...VISITOR, cookies: { 'do-not-sell': '1' }, headers: {} });
  assert.ok(!res.scripts.includes('analytics-share.js'));
  assert.ok(!res.scripts.includes('ads-third-party.js'));
});

test('a visitor who has not opted out gets them', () => {
  const res = renderPage({ ...VISITOR, cookies: {}, headers: {} });
  assert.ok(res.scripts.includes('analytics-share.js'));
  assert.ok(res.scripts.includes('ads-third-party.js'));
});

test('the page still loads its own scripts either way', () => {
  const res = renderPage({ ...VISITOR, cookies: { 'do-not-sell': '1' }, headers: {} });
  assert.ok(res.scripts.includes('app.js'));
  assert.ok(res.scripts.includes('consent-banner.js'));
});

test('the banner form sets the cookie and writes a record', () => {
  optOut.reset();
  const result = optOut.submitOptOutForm({ ...VISITOR });
  assert.equal(result.setCookie['do-not-sell'], '1');
  assert.equal(optOut.recordsFor('v_8812').length, 1);
});

test('the embedded widget honours the cookie too', () => {
  const res = renderEmbed({ ...VISITOR, cookies: { 'do-not-sell': '1' }, headers: {} });
  assert.ok(!res.scripts.includes('partner-audience.js'));
  assert.ok(res.scripts.includes('embed.js'));
});
