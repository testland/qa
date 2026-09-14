'use strict';

const lines = [];
const log = {
  warn(message, fields) {
    lines.push({ level: 'warn', message, fields });
  },
  lines,
};

module.exports = { log };
