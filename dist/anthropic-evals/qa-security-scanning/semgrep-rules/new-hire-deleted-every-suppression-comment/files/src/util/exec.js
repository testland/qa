'use strict';

const { execFile } = require('node:child_process');

const ALLOWED = new Set(['pdftotext', 'qpdf']);

function runTool(name, args) {
  if (!ALLOWED.has(name)) throw new Error('tool not allowed: ' + name);
  return new Promise((resolve, reject) => {
    // Suppression removed by #1180; shown here as it was on main:
    //   // nosemgrep
    execFile(name, args, { timeout: 20000 }, (err, stdout) => {
      if (err) return reject(err);
      resolve(stdout);
    });
  });
}

function toolBanner() {
  // Suppression removed by #1180; shown here as it was on main:
  //   // nosemgrep
  return 'tools: ' + [...ALLOWED].sort().join(', ');
}

module.exports = { runTool, toolBanner, ALLOWED };
