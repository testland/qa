# Appium 3 won't start and the two emulator sessions collide

## Problem Description

Our Android checkout tests run on two emulators in parallel on CI (`emulator-5554` and `emulator-5556`). Since we moved to Appium 3 the server won't start, and before that, under Appium 2, the two sessions collided (see `ci-log.txt`). Fix `wdio.conf.js` and the spec.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: wdio.conf.js ===============
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

=============== FILE: test/specs/checkout.e2e.js ===============
describe('checkout', () => {
  it('pays with a saved card in the web checkout', async () => {
    await $('~cart').click();
    await $('~checkout').click();
    await driver.pause(5000); // wait for the checkout webview
    await driver.switchContext('WEBVIEW_com.shop.app');
    await $('#pay').click();
    await driver.switchContext('NATIVE_APP');
    await expect($('~order-confirmed')).toBeDisplayed();
  });
});

=============== FILE: ci-log.txt ===============
CI runs two emulators: emulator-5554 and emulator-5556 (Appium server 3.x, uiautomator2 driver).
[appium] server failed to start: invalid value for --allow-insecure: chromedriver_autodownload
--- earlier runs on Appium 2 ---
[0-1] Error: Could not start UiAutomator2 server: port 8200 is already in use
[0-0] session started on emulator-5554
[0-1] session started on emulator-5554
[0-0] NoSuchContextError: WEBVIEW_com.shop.app (contexts: NATIVE_APP)
