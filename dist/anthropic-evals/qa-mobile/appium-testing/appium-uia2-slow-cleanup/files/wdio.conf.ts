export const config: WebdriverIO.Config = {
  runner: 'local',
  port: 4723,
  specs: ['./test/**/*.e2e.ts'],
  framework: 'mocha',
  mochaOpts: { timeout: 180000 },
  capabilities: [{
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'emulator-5554',
    'appium:app': './apps/shop-debug.apk',
    'appium:appPackage': 'com.example.shop',
    'appium:fullReset': true,              // fresh install every session so tests start clean
    'appium:waitForIdleTimeout': 0,        // home screen was slow, this was supposed to fix it
  }],
  afterTest: async () => {
    // reset app data between tests
    await driver.execute('mobile: shell', { command: 'pm', args: ['clear', 'com.example.shop'] });
  },
};
