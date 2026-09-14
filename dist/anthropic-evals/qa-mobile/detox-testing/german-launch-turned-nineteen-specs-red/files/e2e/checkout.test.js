describe('Checkout', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('shows the subtotal for a single line', async () => {
    await element(by.text('Barista Oat Milk 1L')).tap();
    await element(by.text('Add to cart')).tap();
    await element(by.text('Checkout')).tap();
    await expect(element(by.text('$4.99'))).toBeVisible();
  });

  it('lets the shopper pick a delivery date', async () => {
    await element(by.text('Checkout')).tap();
    await element(by.label('Delivery date')).tap();
    await expect(element(by.type('RCTImageView')).atIndex(0)).toBeVisible();
  });
});
