'use strict';

function validateTiers(testIds, tiers) {
  const problems = [];
  for (const id of testIds) {
    if (!(id in tiers)) problems.push(`no tier for ${id}`);
  }
  for (const [id, tier] of Object.entries(tiers)) {
    if (!testIds.includes(id)) problems.push(`tier for unknown test ${id}`);
    if (!Number.isInteger(tier) || tier < 1 || tier > 5) {
      problems.push(`tier out of range for ${id}: ${tier}`);
    }
  }
  return problems.sort();
}

module.exports = { validateTiers };
