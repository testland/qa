describe('cart (android)', () => {
  beforeEach(async () => {
    await driver.$('~skip-onboarding').click();
  });

  it('adds and removes an item', async () => {
    await driver.$('~product-0').click();
    await driver.$('~add-to-cart').click();
    await expect(driver.$('~cart-count')).toHaveText('1');

    await driver.$('~cart-tab').click();
    await driver.$('~remove-item-0').click();
    await expect(driver.$('~cart-count')).toHaveText('0');
  });
});
