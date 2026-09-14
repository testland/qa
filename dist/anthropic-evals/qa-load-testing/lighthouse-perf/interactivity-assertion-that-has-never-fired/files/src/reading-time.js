'use strict';

const WORDS_PER_MINUTE = 238;

function readingTimeMinutes(wordCount) {
  if (!Number.isInteger(wordCount) || wordCount < 0) throw new RangeError('bad word count');
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}

module.exports = { readingTimeMinutes, WORDS_PER_MINUTE };
