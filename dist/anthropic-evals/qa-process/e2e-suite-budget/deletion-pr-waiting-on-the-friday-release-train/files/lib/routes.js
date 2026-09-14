'use strict';

function routesForTest(map, testId) {
  return map.tests[testId] ?? [];
}

function testsForRoute(map, route) {
  return Object.keys(map.tests)
    .filter((t) => map.tests[t].includes(route))
    .sort();
}

function allRoutes(map) {
  return [...new Set(Object.values(map.tests).flat())].sort();
}

module.exports = { routesForTest, testsForRoute, allRoutes };
