exports.android = {
  platformName: 'Android',
  automationName: 'UiAutomator2',
  deviceName: 'Android Emulator',
  app: process.env.ANDROID_APP || './build/app-debug.apk',
  appPackage: 'com.acme.shop',
  appActivity: '.MainActivity',
  newCommandTimeout: 120,
};

exports.ios = {
  platformName: 'iOS',
  automationName: 'XCUITest',
  deviceName: 'iPhone Simulator',
  app: process.env.IOS_APP || './build/Shop.app',
  bundleId: 'com.acme.shop',
  newCommandTimeout: 120,
};
