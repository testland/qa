describe('Cart', () => {
  it('adds a product to the cart', async () => {
    await element(by.id('home-search')).tap();
    await element(by.id('home-search')).typeText('oat milk');
    await element(by.id('result-OAT-1')).tap();
    await element(by.id('add-to-cart-button')).tap();
    await expect(element(by.id('cart-count'))).toHaveText('1');
  });

  it('merges a second add of the same product', async () => {
    await element(by.id('home-search')).tap();
    await element(by.id('home-search')).typeText('oat milk');
    await element(by.id('result-OAT-1')).tap();
    await element(by.id('add-to-cart-button')).tap();
    await element(by.id('add-to-cart-button')).tap();
    await expect(element(by.id('cart-count'))).toHaveText('2');
  });
});
