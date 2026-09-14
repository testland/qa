'use strict';

const { exec } = require('node:child_process');
const path = require('node:path');

const WORK_DIR = '/var/lib/ledger/render';

function rasterize(filename, pages) {
  const target = path.join(WORK_DIR, filename);
  return new Promise((resolve, reject) => {
    exec(`pdftotext -f 1 -l ${pages} ${target}`, (err, stdout) => {
      if (err) return reject(err);
      resolve(stdout);
    });
  });
}

function thumbnail(filename, size) {
  return new Promise((resolve, reject) => {
    exec(`convert ${path.join(WORK_DIR, filename)} -resize ${size} out.png`, (err) => {
      if (err) return reject(err);
      resolve(path.join(WORK_DIR, 'out.png'));
    });
  });
}

module.exports = { rasterize, thumbnail, WORK_DIR };
