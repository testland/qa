'use strict';

const NEEDS_QUOTING = /[",\r\n]/;

function formatField(value) {
  if (typeof value !== 'string') {
    throw new TypeError('formatField expects a string');
  }
  if (!NEEDS_QUOTING.test(value)) {
    return value;
  }
  return `"${value.replace(/"/g, '""')}"`;
}

function parseField(text) {
  if (typeof text !== 'string') {
    throw new TypeError('parseField expects a string');
  }
  if (!text.startsWith('"')) {
    return text;
  }
  return text.slice(1, -1).replace(/""/g, '"');
}

module.exports = { formatField, parseField };
