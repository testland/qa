import { expect, test } from 'vitest';
import { customerOrderReport } from '../src/report.js';
import { makeOrder, makeUser } from './factories.js';

test('the report has one row per user', () => {
  const users = [makeUser(), makeUser(), makeUser()];
  const orders = [makeOrder(), makeOrder(), makeOrder(), makeOrder()];

  expect(customerOrderReport(users, orders)).toHaveLength(3);
});

test('a report row carries the user name', () => {
  const user = makeUser();

  const report = customerOrderReport([user], [makeOrder()]);

  expect(report[0].name).toBe(user.name);
});
