'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const vendors = require('./vendors');
const { applyCorrection } = require('./corrections');

const AT = '2026-08-14T09:00:00Z';

test('a correction reaches every vendor that already had the old value', () => {
  vendors.reset();
  vendors.recordShare('analytics-share', 'v_4410', AT);
  vendors.recordShare('partner-audience', 'v_4410', AT);
  vendors.recordShare('analytics-share', 'v_4411', AT);

  const result = applyCorrection({ subjectRef: 'v_4410', field: 'city', value: 'Oakland', at: AT });

  assert.equal(result.notified, 2);
  assert.deepEqual(
    vendors.directivesFor('v_4410').map((d) => d.vendorId).sort(),
    ['analytics-share', 'partner-audience'],
  );
  assert.equal(vendors.directivesFor('v_4411').length, 0);
});

test('a correction for a visitor no vendor holds notifies nobody', () => {
  vendors.reset();
  const result = applyCorrection({ subjectRef: 'v_9999', field: 'city', value: 'Fresno', at: AT });
  assert.equal(result.notified, 0);
});
