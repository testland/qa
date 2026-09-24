// Covers LDR-2210: a push notification tapped from the lock screen lands the
// shopper on the order itself, not on home.
describe('Deep links', () => {
  it('opens straight to an order from a larder:// link', async () => {
    await device.launchApp({ newInstance: true, url: 'larder://orders/9912' });
    await expect(element(by.id('order-detail-9912'))).toBeVisible();
    await expect(element(by.id('order-status'))).toHaveText('Out for delivery');
  });

  it('opens the tracking map from a tracking link', async () => {
    await device.launchApp({ newInstance: true, url: 'larder://orders/9912/track' });
    await expect(element(by.id('tracking-map'))).toBeVisible();
  });
});
