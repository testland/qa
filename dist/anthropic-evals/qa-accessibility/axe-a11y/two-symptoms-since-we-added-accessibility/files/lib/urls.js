const routes = require('../routes.json');

function collectUrls(origin) {
  return routes.filter((r) => r.lighthouse).map((r) => `${origin}${r.path}`);
}

module.exports = { collectUrls };
