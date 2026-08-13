# Migrating a legacy Jasmine / Karma suite to Jest

Companion reference for `js-unit-tests`. Consult when a legacy Jasmine
codebase (typically AngularJS-era, often paired with Karma for in-browser
runs) should move to Jest. Context: Karma has been in maintenance-only mode
since 2023, AngularJS reached end-of-life in January 2022, and new Angular
projects use Jest or Vitest - Karma + Jasmine setups are explicitly legacy.

Jest's API descends from Jasmine (`describe`, `it`, `beforeEach`,
`expect(...).toBe(...)`, spies all originated there), so migration is mostly
mechanical.

## Automated path: jest-codemods

The [jest-codemods](https://github.com/skovhus/jest-codemods) package handles
~80% of the syntax transformations:

```bash
npx jest-codemods
```

Point it at the spec directory and review the diff - it rewrites Jasmine
spy/matcher calls into their Jest equivalents.

## Manual steps for the remainder

1. Replace `spyOn().and.returnValue()` with `jest.spyOn().mockReturnValue()`.
2. Replace `jasmine.createSpy()` with `jest.fn()`.
3. Replace `jasmine.createSpyObj()` with manual `jest.fn()` per method.
4. Replace `expect().toBeNan()` with `expect(Number.isNaN(...)).toBe(true)`
   (matcher renamed).
5. Add `jest.config.js` with an appropriate `testMatch` for the existing
   spec layout (Jasmine's convention is `spec/**/*[sS]pec.js`).
6. Drop Karma if used - Jest provides its own jsdom environment, so the
   browser launcher layer is no longer needed.

After migration, follow SKILL.md for Jest configuration, mocking, coverage,
and CI.

## References

- github.com/skovhus/jest-codemods - automated migration codemods
- jestjs.io/docs/getting-started - Jest setup for the migrated suite
