'use strict';

// Per-test score behind the Monday spreadsheet. In use since Q1.
function score({ regressionsCaught, valueTier, runtimeMin, flakeRate, maintenanceNorm }) {
  return (regressionsCaught * valueTier) / (runtimeMin * flakeRate * (1 + maintenanceNorm));
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

module.exports = { score, median };
