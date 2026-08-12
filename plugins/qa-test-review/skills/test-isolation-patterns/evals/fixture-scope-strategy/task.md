# Integration suite takes 40 minutes and still flakes

## Problem Description

Our order integration tests spin up a database container in `beforeEach`.
There are 94 tests and the container takes roughly 25 seconds to become
ready, which is most of the 40-minute run.

The obvious move is to start the container once. We tried that a year ago and
reverted it, because tests started interfering with each other. We would like
a strategy that gets the time back without reintroducing that.

The suite also inherits through four levels of base class, and nobody is sure
which level owns what.

## Output Specification

Produce `fixture-strategy.md` containing:

1. For each piece of setup in the code below, the scope it should have and
   why.
2. How per-test independence is preserved for anything you move to a wider
   scope - this is the part the previous attempt got wrong.
3. What to do about the base-class chain.
4. Anything that is already correctly scoped and should be left alone.

Do not modify the files. This is the strategy the team will review.

## Input Files

Extract the following files before beginning.

=============== FILE: tests/support/BaseTest.js ===============
'use strict';

class BaseTest {
  async setUp() {
    this.startedAt = Date.now();
    this.logger = createLogger({ level: 'error' });
  }

  async tearDown() {
    this.logger.flush();
  }
}

module.exports = { BaseTest };

=============== FILE: tests/support/AppTest.js ===============
'use strict';

const { BaseTest } = require('./BaseTest');
const { globalConfig } = require('../../src/config');

class AppTest extends BaseTest {
  async setUp() {
    await super.setUp();
    globalConfig.featureFlags.ordersV2 = true;
    this.app = createApp({ config: globalConfig });
  }
}

module.exports = { AppTest };

=============== FILE: tests/support/DomainTest.js ===============
'use strict';

const { AppTest } = require('./AppTest');
const { startPostgresContainer } = require('./containers');

class DomainTest extends AppTest {
  async setUp() {
    await super.setUp();
    this.container = await startPostgresContainer();
    this.db = await connect(this.container.connectionString);
    await runMigrations(this.db);
  }

  async tearDown() {
    await this.db.close();
    await this.container.stop();
    await super.tearDown();
  }
}

module.exports = { DomainTest };

=============== FILE: tests/support/OrderTest.js ===============
'use strict';

const { DomainTest } = require('./DomainTest');

class OrderTest extends DomainTest {
  async setUp() {
    await super.setUp();
    this.catalogue = await seedCatalogue(this.db);
    this.customer = await seedCustomer(this.db, { email: 'buyer@example.test' });
  }
}

module.exports = { OrderTest };

=============== FILE: tests/orders/checkout.test.js ===============
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
