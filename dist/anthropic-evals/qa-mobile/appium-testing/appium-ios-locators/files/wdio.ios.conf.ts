export const config: WebdriverIO.Config = {
  port: 4723,
  specs: ['./test/**/*.e2e.ts'],
  capabilities: [{
    platformName: 'iOS',
    'appium:automationName': 'XCUITest',
    'appium:deviceName': 'iPhone 16',
    'appium:platformVersion': '18.2',
    'appium:app': './apps/Shop.app',
  }],
};
