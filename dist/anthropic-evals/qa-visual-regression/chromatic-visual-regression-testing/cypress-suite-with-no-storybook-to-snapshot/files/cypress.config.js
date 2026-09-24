import { defineConfig } from 'cypress';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { seed } from './cypress/support/seed.js';
import { compareOrSeed } from './cypress/support/visual.mjs';

const diffFn = (a, b) => {
  const left = PNG.sync.read(a);
  const right = PNG.sync.read(b);
  const out = new PNG({ width: left.width, height: left.height });
  return pixelmatch(left.data, right.data, out.data, left.width, left.height, { threshold: 0.1 });
};

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL,
    supportFile: 'cypress/support/e2e.js',
    video: false,
    setupNodeEvents(on) {
      on('task', {
        'db:seed': (fixture) => seed(fixture),
        'visual:compare': ({ name, image }) =>
          compareOrSeed('cypress/baselines', name, Buffer.from(image, 'base64'), diffFn),
      });
    },
  },
});
