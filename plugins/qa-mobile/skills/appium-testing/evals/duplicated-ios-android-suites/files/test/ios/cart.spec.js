describe('cart (ios)', () => {
  beforeEach(async () => {
    await driver.$('~skip-onboarding').click();
  });

  it('adds an item', async () => {
    await driver.$('~product-0').click();
    await driver.$('~add-to-cart').click();
    await expect(driver.$('~cart-count')).toHaveText('1');
  });
});
