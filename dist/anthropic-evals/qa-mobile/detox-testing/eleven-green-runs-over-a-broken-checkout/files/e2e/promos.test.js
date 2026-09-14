describe('Promo codes', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('applies a valid promo code', async () => {
    await element(by.id('cart-tab')).tap();
    await element(by.id('promo-input')).typeText('WELCOME10');
    await element(by.id('apply-promo-button')).tap();
    await expect(element(by.id('subtotal'))).toHaveText('$22.49');
  });

  it('does not show an error for a valid promo code', async () => {
    await element(by.id('cart-tab')).tap();
    await element(by.id('promo-input')).typeText('WELCOME10');
    await element(by.id('apply-promo-button')).tap();
    await expect(element(by.id('promo-error'))).not.toBeVisible();
  });

  it('rejects an expired promo code', async () => {
    await element(by.id('cart-tab')).tap();
    await element(by.id('promo-input')).typeText('SUMMER24');
    await element(by.id('apply-promo-button')).tap();
    await expect(element(by.id('promo-error-banner'))).toBeVisible();
  });
});
