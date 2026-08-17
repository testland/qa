'use strict';

const { db } = require('../src/db');
const { releaseAll } = require('./support/resources');

module.exports = async () => {
  await releaseAll(db);
};
