// Covers LDR-2210: a push notification tapped from the lock screen must land
// the user on the order, not on home. The app must be started BY the link.
describe('Deep links', () => {
  it('opens straight to an order when launched from a larder:// link', async () => {
    await device.launchApp({ newInstance: true, url: 'larder://orders/9912' });
    await expect(element(by.id('order-detail-9912'))).toBeVisible();
    await expect(element(by.id('order-status'))).toHaveText('Out for delivery');
  });

  it('opens the tracking map from a tracking link', async () => {
    await device.launchApp({ newInstance: true, url: 'larder://orders/9912/track' });
    await expect(element(by.id('tracking-map'))).toBeVisible();
  });
});
