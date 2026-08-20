const TARGET = process.env.TARGET || 'android';

const android = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:deviceName': 'Android Emulator',
  'appium:app': process.env.ANDROID_APP,
};

const ios = {
  platformName: 'iOS',
  'appium:automationName': 'XCUITest',
  'appium:deviceName': 'iPhone Simulator',
  'appium:app': process.env.IOS_APP,
};

exports.config = {
  runner: 'local',
  specs: ['./test/specs/**/*.spec.js'],
  framework: 'mocha',
  reporters: ['spec', ['junit', { outputDir: './reports' }]],
  maxInstances: 1,
  capabilities: [TARGET === 'ios' ? ios : android],
  mochaOpts: { timeout: 180000 },
};
