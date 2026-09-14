describe('Checkout', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('places an order and shows the confirmation', async () => {
    await element(by.id('product-OAT-1')).tap();
    await element(by.id('add-to-cart-button')).tap();
    await element(by.id('cart-tab')).tap();
    await element(by.id('place-order-button')).tap();

    await waitFor(element(by.id('order-confirmation'))).toBeVisible();
    await waitFor(element(by.id('order-reference'))).toHaveText('LD-40122');
  });

  it('shows the delivery window on the confirmation', async () => {
    await element(by.id('product-OAT-1')).tap();
    await element(by.id('add-to-cart-button')).tap();
    await element(by.id('cart-tab')).tap();
    await element(by.id('place-order-button')).tap();

    await waitFor(element(by.id('delivery-window'))).toHaveText('Thu 08:00-10:00');
  });

  it('blocks an empty cart from checking out', async () => {
    await element(by.id('cart-tab')).tap();
    await waitFor(element(by.id('place-order-button'))).not.toBeVisible();
    await waitFor(element(by.id('empty-cart-hint'))).toBeVisible();
  });
});
