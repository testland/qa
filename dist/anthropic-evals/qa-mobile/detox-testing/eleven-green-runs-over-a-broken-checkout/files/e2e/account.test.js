const { settle } = require('./helpers/settle');

describe('Account', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('saves a new delivery address', async () => {
    await element(by.id('account-tab')).tap();
    await settle();
    await element(by.id('edit-address-button')).tap();
    await element(by.id('address-line-1')).replaceText('14 Bridge Street');
    await element(by.id('save-address-button')).tap();
    await settle();

    await expect(element(by.id('address-summary'))).toHaveText('14 Bridge Street');
  });

  it('uploads an avatar', async () => {
    await element(by.id('account-tab')).tap();
    await element(by.id('change-avatar-button')).tap();
    await element(by.id('avatar-source-camera-roll')).tap();
    await settle();
    await settle();
    await settle();

    await expect(element(by.id('avatar-image'))).toBeVisible();
  });

  it('signs out', async () => {
    await element(by.id('account-tab')).tap();
    await element(by.id('sign-out-button')).tap();
    await expect(element(by.id('sign-in-screen'))).toBeVisible();
  });
});
