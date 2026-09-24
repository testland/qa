'use strict';

const markers = [];

function seed() {
  markers.length = 0;
}

function record(subjectEmail, at) {
  markers.push({ subjectEmail, erasedAt: at });
}

function find(subjectEmail) {
  return markers.find((m) => m.subjectEmail === subjectEmail) || null;
}

seed();

module.exports = { seed, record, find };
