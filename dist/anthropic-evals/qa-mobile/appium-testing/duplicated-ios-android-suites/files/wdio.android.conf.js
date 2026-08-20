exports.config = {
  runner: 'local',
  hostname: 'localhost',
  port: 4723,
  specs: ['./test/android/**/*.spec.js'],
  framework: 'mocha',
  reporters: ['spec'],
  maxInstances: 1,
  capabilities: [{
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'Android Emulator',
    'appium:app': process.env.ANDROID_APP || './build/app-debug.apk',
  }],
  mochaOpts: { timeout: 120000 },
};
