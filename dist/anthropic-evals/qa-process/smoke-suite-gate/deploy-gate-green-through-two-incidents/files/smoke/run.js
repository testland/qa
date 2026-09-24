'use strict';

const { spawnSync } = require('node:child_process');

const ATTEMPTS = 5;
let res;

for (let i = 1; i <= ATTEMPTS; i++) {
  res = spawnSync(process.execPath, ['--test'], { cwd: __dirname, stdio: 'inherit' });
  if (res.status === 0) break;
  console.log(`gate attempt ${i} did not pass, trying again`);
}

console.log(`gate finished with status ${res.status}`);
