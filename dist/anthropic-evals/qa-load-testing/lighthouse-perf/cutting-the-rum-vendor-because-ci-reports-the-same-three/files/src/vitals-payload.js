'use strict';

function buildBeacon(metric, context) {
  if (!metric || typeof metric.name !== 'string') throw new TypeError('bad metric');
  return {
    name: metric.name,
    value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    rating: metric.rating || 'unknown',
    route: context.route || 'unknown',
    build: context.build || 'unknown',
    connection: context.connection || 'unknown',
  };
}

module.exports = { buildBeacon };
