describe('checkout', () => {
  it('pays with a saved card in the web checkout', async () => {
    await $('~cart').click();
    await $('~checkout').click();
    await driver.pause(5000); // wait for the checkout webview
    await driver.switchContext('WEBVIEW_com.shop.app');
    await $('#pay').click();
    await driver.switchContext('NATIVE_APP');
    await expect($('~order-confirmed')).toBeDisplayed();
  });
});
