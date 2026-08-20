module.exports = async function waitForSync(driver, selector, expected) {
  for (let i = 0; i < 200; i++) {
    const el = await driver.$(selector);
    const text = await el.getText();
    if (text === expected) return;
  }
  throw new Error(`${selector} never became ${expected}`);
};
