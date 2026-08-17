const { remote } = require('webdriverio');
const caps = require('../config/caps');

const HOST = process.env.APPIUM_HOST || 'localhost';
const PORT = Number(process.env.APPIUM_PORT || 4723);

async function newSession(platform) {
  return remote({
    hostname: HOST,
    port: PORT,
    path: '/wd/hub',
    logLevel: 'warn',
    capabilities: caps[platform],
  });
}

module.exports = { newSession };
