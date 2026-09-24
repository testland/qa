'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const FLOOR = 80;

function normalize(url) {
  const withoutOrigin = String(url).replace(/^https?:\/\/[^/]+/, '');
  const withoutQuery = withoutOrigin.split('?')[0].split('#')[0];
  if (!withoutQuery) return '/';
  return withoutQuery.length > 1 ? withoutQuery.replace(/\/+$/, '') : withoutQuery;
}

function uniquePaths(urls) {
  return [...new Set(urls.map(normalize))].sort();
}

function matchRoute(candidate, routes) {
  const segments = candidate.split('/').filter(Boolean);
  return (
    routes.find((route) => {
      const routeSegments = route.path.split('/').filter(Boolean);
      if (routeSegments.length !== segments.length) return false;
      return routeSegments.every((seg, i) => seg.startsWith(':') || seg === segments[i]);
    }) || null
  );
}

function summarise(reportFile) {
  const report = JSON.parse(fs.readFileSync(path.join(ROOT, reportFile), 'utf8'));
  const scanned = uniquePaths(report.spider.urls);
  const universe = uniquePaths(report.site.map((entry) => entry.url));
  const covered = universe.filter((u) => scanned.includes(u));
  const pct = Math.round((covered.length / universe.length) * 1000) / 10;
  return { scanned: scanned.length, universe: universe.length, covered: covered.length, pct };
}

if (require.main === module) {
  const result = summarise(process.argv[2] || 'reports/zap-report.json');
  console.log(
    'scanned=' + result.scanned + ' of ' + result.universe +
    ' routes; coverage=' + result.pct + '% (floor ' + FLOOR + '%)',
  );
  process.exit(result.pct >= FLOOR ? 0 : 1);
}

module.exports = { normalize, uniquePaths, matchRoute, summarise, FLOOR };
