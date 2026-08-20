exports.config = {
  runner: 'local',
  hostname: 'localhost',
  port: 4723,
  specs: ['./test/ios/**/*.spec.js'],
  framework: 'mocha',
  reporters: ['spec'],
  maxInstances: 1,
  capabilities: [{
    platformName: 'iOS',
    'appium:automationName': 'XCUITest',
    'appium:deviceName': 'iPhone Simulator',
    'appium:app': process.env.IOS_APP || './build/Shop.app',
  }],
  mochaOpts: { timeout: 120000 },
};
