const assert = require('node:assert');
const { Given, When, Then } = require('@cucumber/cucumber');
const orders = require('../../src/orders');

Given('the test database is empty', function () {
  orders.reset();
});

Given('the API client is authenticated with the seed token', function () {
  orders.authenticate('seed-token');
});

Given('the catalogue lists {string} at ${float}', function (sku, price) {
  orders.listProduct(sku, price);
});

Given('a customer {string} with a confirmed email', function (name) {
  orders.addCustomer(name, true);
});

Given('a customer {string} with an unconfirmed email', function (name) {
  orders.addCustomer(name, false);
});

Given('{word} has a pending order', function (name) {
  this.order = orders.placeOrder(name, 'BOOK-001', 1).order;
});

Given('{word} has a cancelled order', function (name) {
  this.order = orders.placeOrder(name, 'BOOK-001', 1).order;
  orders.cancel(this.order.id);
});

When('{word} orders {int} of {string}', function (name, qty, sku) {
  this.result = orders.placeOrder(name, sku, qty);
});

When('the order is cancelled', function () {
  this.result = orders.cancel(this.order.id);
});

Then("{word}'s history shows {int} order worth ${float}", function (name, count, total) {
  const history = orders.historyFor(name);
  assert.strictEqual(history.length, count);
  assert.strictEqual(history[0].total, total);
});

Then('the order status is {string}', function (status) {
  assert.strictEqual(this.result.order.status, status);
});

Then('the cancellation is refused because {string}', function (reason) {
  assert.strictEqual(this.result.cancelled, false);
  assert.strictEqual(this.result.reason, reason);
});

Then('the order is refused because {string}', function (reason) {
  assert.strictEqual(this.result.placed, false);
  assert.strictEqual(this.result.reason, reason);
});
