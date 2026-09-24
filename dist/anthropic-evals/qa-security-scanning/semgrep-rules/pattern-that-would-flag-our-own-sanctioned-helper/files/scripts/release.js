'use strict';

const { execSync } = require('node:child_process');

function tagRelease() {
  execSync('git fetch --tags');
  execSync('git describe --tags --abbrev=0');
  execSync('git rev-parse --abbrev-ref HEAD');
  execSync('npm pack --dry-run');
  return execSync('git log -1 --pretty=%H').toString().trim();
}

module.exports = { tagRelease };
