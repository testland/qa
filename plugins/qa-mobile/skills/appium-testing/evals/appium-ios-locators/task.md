# Slow, flaky iOS locators in the login test

## Problem Description

Make the iOS locators in `test/login.e2e.ts` fast and stable (`notes.md`, `wdio.ios.conf.ts`).

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: test/login.e2e.ts ===============
describe('login', () => {
  it('logs in', async () => {
    await $('//XCUIElementTypeApplication/XCUIElementTypeWindow[1]/XCUIElementTypeOther/XCUIElementTypeOther[2]/XCUIElementTypeTextField').setValue('qa@example.com');
    await $('//XCUIElementTypeSecureTextField[@name="Password"]').setValue('secret');
    await $('//*[@label="Log in"]').click();
    // iOS asks "Allow notifications?" after the first login
    await $('//XCUIElementTypeButton[@name="Allow"]').click();
    await expect($('//XCUIElementTypeStaticText[@name="Welcome"]')).toBeDisplayed();
  });
});

=============== FILE: wdio.ios.conf.ts ===============
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

=============== FILE: notes.md ===============
- Each lookup takes 3 to 8 seconds on iOS; the whole login spec takes almost a minute.
- Clicking "Allow" fails now and then.
- The app is being translated to German next quarter; the tests must keep working.
- The iOS developers can add accessibility identifiers if we tell them which ones.
