import { worker } from '../../src/mocks/browser.js';

before(() => worker.start({ onUnhandledRequest: 'error' }));
