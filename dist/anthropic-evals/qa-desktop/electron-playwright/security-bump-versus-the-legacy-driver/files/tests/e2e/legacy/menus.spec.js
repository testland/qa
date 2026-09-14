const assert = require('node:assert');
const Application = require('spectron').Application;

describe('application menus', function () {
  this.timeout(30000);
  let app;

  before(async () => {
    app = new Application({ path: require('electron'), args: ['.'] });
    await app.start();
  });

  after(async () => {
    if (app && app.isRunning()) {
      await app.stop();
    }
  });

  it('opens with a single window', async () => {
    assert.strictEqual(await app.client.getWindowCount(), 1);
  });

  it('exposes the File menu', async () => {
    const label = await app.client.$('[role="menubar"] >> nth=0').getText();
    assert.match(label, /File/);
  });
});
