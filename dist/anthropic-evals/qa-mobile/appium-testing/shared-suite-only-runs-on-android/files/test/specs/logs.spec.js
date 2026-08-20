describe('crash reporting', () => {
  it('writes a breadcrumb file on a handled error', async () => {
    await driver.$('~trigger-handled-error').click();
    const out = await driver.execute('mobile: shell', {
      command: 'cat',
      args: ['/data/data/com.acme.shop/files/breadcrumbs.log'],
    });
    if (!out.includes('handled-error')) throw new Error('no breadcrumb written');
  });

  it('keeps the app usable after a handled error', async () => {
    await driver.$('~dismiss-error').click();
    await expect(driver.$('~catalog-screen')).toBeDisplayed();
  });
});
