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
