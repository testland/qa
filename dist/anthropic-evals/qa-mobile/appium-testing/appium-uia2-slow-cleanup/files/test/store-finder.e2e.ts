describe('store finder', () => {
  it('shows the nearest store', async () => {
    await $('~Stores').click();
    // Android asks for location on the first launch
    await $('//android.widget.Button[@text="Allow"]').click();
    await expect($('~nearest-store')).toBeDisplayed();
  });
});
