// Covers LDR-2402: the welcome tour is offered once and never again. The
// "seen" flag is written to AsyncStorage by src/onboarding.js.
describe('Welcome tour', () => {
  it('offers the tour to a shopper who has not seen it', async () => {
    await expect(element(by.id('welcome-tour'))).toBeVisible();
    await element(by.id('welcome-tour-next')).tap();
    await element(by.id('welcome-tour-next')).tap();
    await element(by.id('welcome-tour-done')).tap();
    await expect(element(by.id('home-screen'))).toBeVisible();
  });

  it('does not offer the tour again once it has been dismissed', async () => {
    await element(by.id('welcome-tour-skip')).tap();
    await device.reloadReactNative();
    await expect(element(by.id('welcome-tour'))).not.toBeVisible();
    await expect(element(by.id('home-screen'))).toBeVisible();
  });
});
