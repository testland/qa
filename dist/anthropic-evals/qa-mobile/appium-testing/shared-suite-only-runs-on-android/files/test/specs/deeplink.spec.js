describe('deep links', () => {
  it('opens the order screen from a deep link', async () => {
    await driver.startActivity('com.acme.shop', '.DeepLinkActivity');
    await expect(driver.$('~order-screen')).toBeDisplayed();
  });

  it('returns to the catalog with the back control', async () => {
    await driver.$('~order-screen').waitForDisplayed();
    await driver.pressKeyCode(4);
    await expect(driver.$('~catalog-screen')).toBeDisplayed();
  });
});
