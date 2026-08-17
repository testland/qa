'use strict';

const { OrderTest } = require('../support/OrderTest');

describe('checkout', () => {
  const context = new OrderTest();

  beforeEach(async () => {
    await context.setUp();
  });

  afterEach(async () => {
    await context.tearDown();
  });

  it('places an order for an in-stock item', async () => {
    const order = await context.app.checkout({
      customerId: context.customer.id,
      sku: context.catalogue[0].sku,
    });
    expect(order.status).toBe('placed');
  });

  it('rejects an order for an out-of-stock item', async () => {
    const order = await context.app.checkout({
      customerId: context.customer.id,
      sku: context.catalogue[1].sku,
    });
    expect(order.status).toBe('rejected');
  });
});
