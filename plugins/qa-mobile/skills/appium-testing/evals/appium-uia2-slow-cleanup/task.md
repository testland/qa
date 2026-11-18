# The Android suite is slow, a test fails on new emulators, cleanup errors

## Problem Description

Our Android Appium suite is very slow, the store finder test fails on newer emulators, and the cleanup hook errors (`wdio.conf.ts`, `test/store-finder.e2e.ts`, `ci-log.txt`). Fix it.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: wdio.conf.ts ===============
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

=============== FILE: test/store-finder.e2e.ts ===============
describe('store finder', () => {
  it('shows the nearest store', async () => {
    await $('~Stores').click();
    // Android asks for location on the first launch
    await $('//android.widget.Button[@text="Allow"]').click();
    await expect($('~nearest-store')).toBeDisplayed();
  });
});

=============== FILE: ci-log.txt ===============
[0-0] RUNNING in Android - file:///test/store-finder.e2e.ts
[0-0] 2026-11-14T08:01:12 findElement accessibility id=Stores  (10.04s)
[0-0] 2026-11-14T08:01:22 click                                 (10.02s)
[0-0] 2026-11-14T08:01:33 findElement xpath=//android.widget.Button[@text="Allow"] (10.06s)
[0-0] Error: element ("//android.widget.Button[@text="Allow"]") still not existing after 10000ms
[0-0]   (Pixel 8 API 35: the dialog button reads "While using the app")
[0-0] afterTest hook failed: Potentially insecure feature 'adb_shell' has not been enabled.
[0-0] Note: the home screen plays a looping Lottie animation. Each session also spends ~45s reinstalling the APK.
