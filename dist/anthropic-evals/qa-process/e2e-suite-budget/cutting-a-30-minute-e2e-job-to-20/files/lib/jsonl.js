'use strict';

function parseJsonl(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line, i) => {
      try {
        return JSON.parse(line);
      } catch (e) {
        throw new Error(`line ${i + 1}: ${e.message}`);
      }
    });
}

module.exports = { parseJsonl };
