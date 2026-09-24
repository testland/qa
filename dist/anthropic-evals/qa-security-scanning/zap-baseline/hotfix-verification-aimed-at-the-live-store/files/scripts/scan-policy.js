'use strict';

// Every DAST job calls this before the scanner starts. Non-zero exit blocks it.

const ACTIVE_SCANNERS = new Set(['nuclei', 'zap-full-scan.py']);

function check(plan) {
  if (!plan || !plan.scanner || !plan.environment) {
    return { allowed: false, reason: 'incomplete plan' };
  }
  if (plan.environment === 'production' && ACTIVE_SCANNERS.has(plan.scanner)) {
    return {
      allowed: false,
      reason: plan.scanner + ' sends active payloads and may not run against production',
    };
  }
  return { allowed: true, reason: 'permitted' };
}

if (require.main === module) {
  const [scanner, environment] = process.argv.slice(2);
  const result = check({ scanner, environment });
  console.log((result.allowed ? 'ALLOW ' : 'BLOCK ') + scanner + ' -> ' + environment + ': ' + result.reason);
  process.exit(result.allowed ? 0 : 1);
}

module.exports = { check, ACTIVE_SCANNERS };
