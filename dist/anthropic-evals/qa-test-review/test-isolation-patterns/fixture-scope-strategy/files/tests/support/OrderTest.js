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
