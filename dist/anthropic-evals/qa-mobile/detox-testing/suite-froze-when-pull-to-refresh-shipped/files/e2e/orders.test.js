describe('Orders', () => {
  it('shows the most recent order first', async () => {
    await element(by.id('orders-tab')).tap();
    await expect(element(by.id('order-row-1188'))).toBeVisible();
  });

  it('filters by delivery date', async () => {
    await element(by.id('orders-tab')).tap();
    await element(by.id('filter-this-week')).tap();
    await expect(element(by.id('order-count'))).toHaveText('2 orders');
  });

  it('reorders a past order', async () => {
    await element(by.id('orders-tab')).tap();
    await element(by.id('order-row-1042')).tap();
    await element(by.id('reorder-button')).tap();
    await expect(element(by.id('cart-count'))).toHaveText('2');
  });
});
