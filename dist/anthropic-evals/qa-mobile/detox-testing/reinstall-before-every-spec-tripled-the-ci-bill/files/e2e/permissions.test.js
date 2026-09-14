// Covers LDR-1877: the in-app banner reflects the OS notification grant and
// does not reappear once the shopper has granted.
describe('Notification permissions', () => {
  it('hides the opt-in banner when notifications are granted', async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'YES' } });
    await element(by.id('account-tab')).tap();
    await expect(element(by.id('notifications-optin-banner'))).not.toBeVisible();
  });

  it('shows the opt-in banner when notifications are denied', async () => {
    await device.launchApp({ newInstance: true, permissions: { notifications: 'NO' } });
    await element(by.id('account-tab')).tap();
    await expect(element(by.id('notifications-optin-banner'))).toBeVisible();
  });
});
