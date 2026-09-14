// Branch ines/tracking-map-spec. Never passed. Opened 2026-06-19.
describe('Live tracking map', () => {
  it('shows the courier moving towards the delivery address', async () => {
    await element(by.id('orders-tab')).tap();
    await element(by.id('order-row-9912')).tap();
    await element(by.id('track-order-button')).tap();

    await expect(element(by.id('tracking-map'))).toBeVisible();
    await expect(element(by.id('courier-eta'))).toHaveText('12 min');
  });
});
