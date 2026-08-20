const waitForSync = require('../helpers/waitForSync');

describe('offline behaviour', () => {
  it('queues an order while the device is offline', async () => {
    await driver.toggleWiFi();
    await driver.$('~product-0').click();
    await driver.$('~add-to-cart').click();
    await expect(driver.$('~queued-badge')).toBeDisplayed();

    await driver.toggleWiFi();
    await waitForSync(driver, '~cart-count', '1');
    await expect(driver.$('~queued-badge')).not.toBeDisplayed();
  });

  it('shows the sync notification', async () => {
    await driver.openNotifications();
    await expect(driver.$('~sync-complete-notification')).toBeDisplayed();
  });
});
