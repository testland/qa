# Mobile-web emulation - device profiles and the Cypress runner

Lookup reference for the full Playwright `devices` catalog and for the Cypress
equivalent of viewport emulation. Referenced from Step 1 and the References of
the mobile-web-emulation-runner skill.

## Playwright device profiles

Playwright ships a `devices` catalog with realistic viewport / DPR /
user-agent combinations:

```typescript
import { devices } from '@playwright/test';

// Common modern profiles:
devices['iPhone 15']
devices['iPhone 15 Pro Max']
devices['iPhone 14']
devices['Pixel 7']
devices['Pixel 5']
devices['Galaxy S9+']
devices['iPad Pro 11']
devices['iPad Mini']
```

Each entry includes:

```javascript
{
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; ...) AppleWebKit/...',
}
```

`isMobile: true` triggers Playwright's mobile-mode quirks (meta
viewport handling); `hasTouch: true` enables touch-event synthesis.

## Cypress equivalent

```javascript
// cypress.config.ts
const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // Per-test or per-spec viewport
    },
    viewportWidth: 1280,
    viewportHeight: 720,
  },
});

// In a test:
beforeEach(() => {
  cy.viewport('iphone-15');   // built-in preset
  // OR
  cy.viewport(393, 852, 'portrait');
});
```

Cypress doesn't ship a `devices` catalog as rich as Playwright's;
viewport sizing is the primary control. For touch-event synthesis,
use `cy.realTouch()` (via `cypress-real-events` plugin).
