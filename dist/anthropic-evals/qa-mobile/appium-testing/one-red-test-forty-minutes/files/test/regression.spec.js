const { remote } = require('webdriverio');
const { seedUser, catalogItem } = require('./helpers/appData');

const caps = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:deviceName': 'Android Emulator',
  'appium:app': process.env.ANDROID_APP || './build/app-debug.apk',
};

let driver;
let orderId;

describe('regression', () => {
  before(async () => {
    driver = await remote({ hostname: 'localhost', port: 4723, capabilities: caps });
  });

  it('full regression pass', async function () {
    this.timeout(45 * 60 * 1000);
    const user = seedUser();

    // --- sign in ---
    await driver.$('~email-field').setValue(user.email);
    await driver.$('~password-field').setValue(user.password);
    await driver.$('~sign-in').click();
    await expect(driver.$('~account-home')).toBeDisplayed();

    // --- browse ---
    await driver.$('~catalog-tab').click();
    await driver.$('~search').setValue(catalogItem().name);
    await expect(driver.$('~result-0')).toBeDisplayed();

    // --- cart ---
    await driver.$('~result-0').click();
    await driver.$('~add-to-cart').click();
    await expect(driver.$('~cart-count')).toHaveText('1');

    // --- checkout ---
    await driver.$('~cart-tab').click();
    await driver.$('~checkout').click();
    await driver.$('~card-number').setValue('4242424242424242');
    await driver.$('~pay').click();
    await expect(driver.$('~order-confirmed')).toBeDisplayed();
    orderId = await driver.$('~order-id').getText();

    // --- order history ---
    await driver.$('~account-tab').click();
    await driver.$('~orders').click();
    await expect(driver.$(`~order-${orderId}`)).toBeDisplayed();

    // --- profile edit ---
    await driver.$('~account-tab').click();
    await driver.$('~edit-profile').click();
    await driver.$('~display-name').setValue('QA Bot');
    await driver.$('~save').click();
    await expect(driver.$('~profile-saved-toast')).toBeDisplayed();

    // --- sign out ---
    await driver.$('~account-tab').click();
    await driver.$('~sign-out').click();
    await expect(driver.$('~sign-in')).toBeDisplayed();
  });
});
