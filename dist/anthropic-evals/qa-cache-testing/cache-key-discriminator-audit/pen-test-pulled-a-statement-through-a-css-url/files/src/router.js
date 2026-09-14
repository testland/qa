'use strict';

const routes = [
  { name: 'statement', pattern: /^\/account\/statement(?:\/.*)?$/ },
  { name: 'messages', pattern: /^\/account\/messages(?:\/.*)?$/ },
  { name: 'asset', pattern: /^\/assets\/.+$/ },
  { name: 'marketing', pattern: /^\/site\/.*$/ },
];

function route(url) {
  const match = routes.find((r) => r.pattern.test(url));
  return match ? match.name : null;
}

module.exports = { route, routes };
