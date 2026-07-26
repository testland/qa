# Jasmine: Karma browser tests and migrating to Jest

Deep reference for `jasmine-tests` SKILL.md. Consult when running Jasmine
specs in a real browser via Karma (the legacy Angular CLI default), or when
moving a Jasmine suite to Jest.

## Karma integration (browser tests)

For browser-environment tests (legacy Angular CLI default):

```bash
npm install --save-dev karma karma-jasmine karma-chrome-launcher
```

`karma.conf.js`:

```javascript
module.exports = function(config) {
  config.set({
    frameworks: ['jasmine'],
    files: ['src/**/*.spec.js'],
    browsers: ['ChromeHeadless'],
    singleRun: true,
    reporters: ['progress', 'junit'],
  });
};
```

```bash
npx karma start
```

**Important migration note:** Karma is in maintenance-only mode as of 2023;
AngularJS reached end-of-life Jan 2022; new Angular projects use Jest or
Vitest. Karma + Jasmine setups are explicitly legacy.

## Migration to Jest path

Jest's API is mostly compatible with Jasmine - typical migration steps:

1. Replace `spyOn().and.returnValue()` with `jest.spyOn().mockReturnValue()`
2. Replace `jasmine.createSpy()` with `jest.fn()`
3. Replace `jasmine.createSpyObj()` with manual `jest.fn()` per method
4. Replace `expect().toBeNan()` with `expect(Number.isNaN()).toBe(true)`
   (matcher renamed)
5. Add `jest.config.js` with appropriate `testMatch`
6. Drop Karma if used (Jest handles its own jsdom env)

For automated migration: `jest-codemods` package handles ~80% of the syntax
transformations.
