'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseRules, actionFor, blocking, flatten, unaccepted } = require('./dast-gate');

test('a well-formed entry with a trailing comment parses', () => {
  const { rules, problems } = parseRules('10049\tIGNORE\t*\t# legacy cookie, ops-2231');
  assert.deepEqual(problems, []);
  assert.deepEqual(rules, [{ id: '10049', action: 'IGNORE', pattern: '*' }]);
});

test('a space-separated entry is reported and never becomes a rule', () => {
  const { rules, problems } = parseRules('10038 IGNORE *');
  assert.equal(rules.length, 0);
  assert.match(problems[0], /tab-separated/);
});

test('an action the scanner does not understand is reported', () => {
  const { problems } = parseRules('10202\tSKIP\t*');
  assert.equal(problems.length, 1);
  assert.match(problems[0], /unknown action/);
});

test('an alert with no matching rule blocks the check', () => {
  const rules = [{ id: '10049', action: 'IGNORE', pattern: '*' }];
  const found = [
    { rule_id: '10049', name: 'a', url: 'https://app.veridianpay.dev/' },
    { rule_id: '90033', name: 'b', url: 'https://checkout.veridianpay.dev/' },
  ];
  assert.deepEqual(blocking(found, rules).map((f) => f.rule_id), ['90033']);
});

test('a scoped rule covers only urls under its prefix', () => {
  const rules = [{ id: '10035', action: 'IGNORE', pattern: 'https://app.veridianpay.dev/legacy/*' }];
  assert.equal(actionFor({ rule_id: '10035', url: 'https://app.veridianpay.dev/legacy/r' }, rules), 'IGNORE');
  assert.equal(actionFor({ rule_id: '10035', url: 'https://app.veridianpay.dev/account' }, rules), 'FAIL');
});

test('alerts are flattened per instance and matched against the accepted list', () => {
  const found = flatten({
    site: [
      {
        '@name': 'https://checkout.veridianpay.dev',
        alerts: [
          {
            pluginid: '10054',
            name: 'Cookie without SameSite Attribute',
            instances: [{ uri: 'https://checkout.veridianpay.dev/cart' }],
          },
        ],
      },
    ],
  });
  assert.equal(found.length, 1);
  assert.deepEqual(unaccepted(found, found), []);
  assert.equal(unaccepted(found, []).length, 1);
});
