describe('Reorder', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('reorders the most recent order', async () => {
    await element(by.id('orders-tab')).tap();
    await element(by.id('order-row')).atIndex(0).tap();
    await element(by.id('reorder-button')).tap();
    await expect(element(by.id('cart-count'))).toHaveText('1');
  });

  it('reorders an older order further down the list', async () => {
    await element(by.id('orders-tab')).tap();
    await element(by.id('order-row')).atIndex(30).tap();
    await element(by.id('reorder-button')).tap();
    await expect(element(by.id('cart-count'))).toHaveText('2');
  });

  it('skips out-of-stock lines when reordering', async () => {
    await element(by.id('orders-tab')).tap();
    await element(by.id('order-row')).atIndex(30).tap();
    await element(by.id('reorder-button')).tap();
    await expect(element(by.id('reorder-skipped-notice'))).toBeVisible();
  });
});
