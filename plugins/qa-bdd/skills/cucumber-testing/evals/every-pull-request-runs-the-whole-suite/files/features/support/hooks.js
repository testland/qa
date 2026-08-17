const { Before } = require('@cucumber/cucumber');
const { seedCatalogue } = require('../../src/store');

Before(function () {
  seedCatalogue(5000);
});
