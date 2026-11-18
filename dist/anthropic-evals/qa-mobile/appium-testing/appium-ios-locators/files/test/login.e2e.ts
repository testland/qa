describe('login', () => {
  it('logs in', async () => {
    await $('//XCUIElementTypeApplication/XCUIElementTypeWindow[1]/XCUIElementTypeOther/XCUIElementTypeOther[2]/XCUIElementTypeTextField').setValue('qa@example.com');
    await $('//XCUIElementTypeSecureTextField[@name="Password"]').setValue('secret');
    await $('//*[@label="Log in"]').click();
    // iOS asks "Allow notifications?" after the first login
    await $('//XCUIElementTypeButton[@name="Allow"]').click();
    await expect($('//XCUIElementTypeStaticText[@name="Welcome"]')).toBeDisplayed();
  });
});
