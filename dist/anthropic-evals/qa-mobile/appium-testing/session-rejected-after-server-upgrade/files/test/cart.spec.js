const { newSession } = require('./hooks');

describe('cart', () => {
  let driver;
  const platform = process.env.TARGET || 'android';

  beforeEach(async () => {
    driver = await newSession(platform);
  });

  afterEach(async () => {
    if (driver) await driver.deleteSession();
  });

  it('adds an item to the cart', async () => {
    await (await driver.$('~product-0')).click();
    await (await driver.$('~add-to-cart')).click();
    const count = await (await driver.$('~cart-count')).getText();
    if (count !== '1') throw new Error(`expected 1, got ${count}`);
  });
});
