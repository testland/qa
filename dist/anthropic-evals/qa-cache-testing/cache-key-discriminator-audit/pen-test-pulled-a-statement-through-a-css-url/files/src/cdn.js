'use strict';

const rules = require('../config/cdn-rules.json');

function classify(req, res) {
  for (const rule of rules) {
    if (rule.match === 'suffix' && req.url.endsWith(rule.value)) return rule;
    if (rule.match === 'prefix' && req.url.startsWith(rule.value)) return rule;
    if (rule.match === 'content-type') {
      const mediaType = String(res.headers['content-type'] || '').split(';')[0].trim();
      if (mediaType === rule.value) return rule;
    }
  }
  return null;
}

module.exports = { classify, rules };
