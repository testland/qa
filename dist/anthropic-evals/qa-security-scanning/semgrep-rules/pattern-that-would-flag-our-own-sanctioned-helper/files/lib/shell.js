'use strict';

// The sanctioned path for running an external tool. Reviewed by security,
// owned by platform. Nothing else in this repo may call child_process directly.

const { exec } = require('node:child_process');

const ALLOWED_TOOLS = new Set(['git', 'pdftotext', 'qpdf', 'convert']);

function quoteArg(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

function buildCommand(tool, args) {
  if (!ALLOWED_TOOLS.has(tool)) throw new Error('tool not allowed: ' + tool);
  if (!Array.isArray(args)) throw new TypeError('args must be an array');
  return [tool, ...args.map(quoteArg)].join(' ');
}

function run(tool, args, opts = {}) {
  const command = buildCommand(tool, args);
  return new Promise((resolve, reject) => {
    exec(command, { timeout: opts.timeoutMs || 30000 }, (err, stdout, stderr) => {
      if (err) return reject(Object.assign(err, { stderr }));
      resolve(stdout);
    });
  });
}

module.exports = { run, buildCommand, quoteArg, ALLOWED_TOOLS };
