import { worker } from './mocks/browser.js';
import { loadProfile } from './app.js';

worker.start({ onUnhandledRequest: 'bypass' });

loadProfile().then((profile) => {
  document.querySelector('#name').textContent = profile.name;
  document.querySelector('#plan').textContent = profile.plan;
});
