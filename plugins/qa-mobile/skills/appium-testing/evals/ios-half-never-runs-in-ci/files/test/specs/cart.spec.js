describe('cart', () => {
  it('adds an item', async () => {
    await driver.$('~product-0').click();
    await driver.$('~add-to-cart').click();
    await expect(driver.$('~cart-count')).toHaveText('1');
  });
});
