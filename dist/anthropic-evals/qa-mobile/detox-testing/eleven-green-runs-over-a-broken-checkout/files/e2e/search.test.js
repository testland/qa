describe('Search', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('finds a product by name', async () => {
    await element(by.id('home-search')).tap();
    await element(by.id('home-search')).typeText('oat milk');
    await expect(element(by.id('result-OAT-1'))).toBeVisible();
  });

  it('shows the empty state for a term with no matches', async () => {
    await element(by.id('home-search')).tap();
    await element(by.id('home-search')).typeText('xylophone');
    await expect(element(by.id('search-empty-state'))).toBeVisible();
  });
});
