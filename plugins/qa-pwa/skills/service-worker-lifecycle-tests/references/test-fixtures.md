# Test fixtures: versioned SW server

Companion to `service-worker-lifecycle-tests`. Lifecycle tests need a
server whose `/sw.js` changes between v1 and v2 while the page stays
open, and a slow-install worker. A query parameter on the page does not
do this: `registration.update()` re-fetches the registered script URL,
so the script bytes must change on the server.

## Server

The test flips the version with `POST /__test/sw-version/<n>`; the SW
reports its version over `postMessage`, and its cache is named after
it. `Cache-Control: no-store` keeps the update check from reading a
cached script. Serving from `http://localhost` is enough: browsers
treat localhost as a secure context, which service workers require
([MDN secure contexts][mdn-secure]).

```js
// tests/fixtures/sw-server.mjs - serves the page and a versioned SW
import http from 'node:http';

let version = 1;                       // flipped by the test, never by the page
const page = `<!doctype html><title>sw</title>
<script>navigator.serviceWorker.register('/sw.js')</script>`;

const sw = (v) => `
const VERSION = ${v};
const CACHE = 'app-v' + VERSION;
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/'])));
  self.skipWaiting();                  // remove to test the waiting path
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('message', (e) => {
  if (e.data === 'version') e.ports[0].postMessage(VERSION);
});
`;

const slowSw = `
self.addEventListener('install', (e) => {
  e.waitUntil(new Promise((r) => setTimeout(r, 2000)));   // slow precache
});
`;

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url.startsWith('/__test/sw-version/')) {
    version = Number(req.url.split('/').pop());
    return res.end(String(version));
  }
  if (req.url === '/sw.js' || req.url === '/sw-slow-install.js') {
    res.setHeader('Content-Type', 'text/javascript');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(req.url === '/sw.js' ? sw(version) : slowSw);
  }
  res.setHeader('Content-Type', 'text/html');
  res.end(page);
}).listen(3000);
```

The server holds one version for everyone, so run lifecycle specs with
one worker (`--workers=1`, or a Playwright project with `workers: 1`).
With parallel workers, one test's flip to v2 lands in another test's
v1 assertions.

## Playwright config

```js
// playwright.config.mjs (lifecycle project)
export default {
  testMatch: /sw-lifecycle\.spec\.mjs/,
  workers: 1,
  use: { browserName: 'chromium' },
  webServer: { command: 'node tests/fixtures/sw-server.mjs', port: 3000 },
};
```

`webServer` starts the server before the tests and stops it after
([Playwright web server][pw-webserver]).

[mdn-secure]: https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts
[pw-webserver]: https://playwright.dev/docs/test-webserver
