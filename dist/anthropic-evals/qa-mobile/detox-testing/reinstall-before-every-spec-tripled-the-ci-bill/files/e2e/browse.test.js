describe('Browse', () => {
  it('searches the catalogue', async () => {
    await element(by.id('home-search')).tap();
    await element(by.id('home-search')).typeText('oat milk');
    await expect(element(by.id('result-OAT-1'))).toBeVisible();
  });

  it('opens a product from search results', async () => {
    await element(by.id('home-search')).tap();
    await element(by.id('home-search')).typeText('oat milk');
    await element(by.id('result-OAT-1')).tap();
    await expect(element(by.id('product-title'))).toHaveText('Barista Oat Milk 1L');
  });
});
