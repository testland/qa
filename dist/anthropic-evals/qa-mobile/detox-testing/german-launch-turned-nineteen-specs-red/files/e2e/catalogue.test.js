describe('Catalogue', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('adds a product to the cart from the product card', async () => {
    await element(by.text('Barista Oat Milk 1L')).tap();
    await element(by.text('Add to cart')).tap();
    await expect(element(by.label('Cart'))).toBeVisible();
  });

  it('shows the organic badge on organic products', async () => {
    await element(by.text('Barista Oat Milk 1L')).tap();
    await expect(element(by.type('RCTImageView')).atIndex(1)).toBeVisible();
  });

  it('shows an out-of-stock notice', async () => {
    await element(by.text('Seasonal Figs 250g')).tap();
    await expect(element(by.text('Out of stock'))).toBeVisible();
  });
});
