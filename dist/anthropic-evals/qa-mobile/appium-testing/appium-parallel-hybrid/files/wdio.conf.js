exports.config = {
  runner: 'local',
  specs: ['./test/specs/**/*.e2e.js'],
  maxInstances: 2,
  capabilities: [
    {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:deviceName': 'Android Emulator',
      'appium:app': './apps/shop-debug.apk',
      'appium:chromedriverAutodownload': true,
    },
    {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:deviceName': 'Android Emulator',
      'appium:app': './apps/shop-debug.apk',
      'appium:chromedriverAutodownload': true,
    },
  ],
  services: [['appium', { args: { allowInsecure: 'chromedriver_autodownload' } }]],
  framework: 'mocha',
};
