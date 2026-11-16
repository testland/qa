---
name: chromatic-visual-regression-testing
description: "Use when visual regression tests run on Chromatic Cloud for Storybook, Playwright or Cypress: the chromatic CLI, baselines, TurboSnap, UI Review, CI gating and reading exit codes to tell visual changes from errors."
---

# chromatic-visual-regression-testing

## Overview

Chromatic is a visual testing platform built by the team behind Storybook
([chromatic-overview][overview]). It works in three modes:

- **Storybook (default):** every story becomes a snapshot.
- **Playwright:** snapshots are captured during Playwright test runs via
  the `--playwright` flag.
- **Cypress:** snapshots are captured during Cypress runs via
  `--cypress`.

[overview]: https://www.chromatic.com/docs/

The CLI shape: `chromatic` is one binary; everything (auth, framework
choice, TurboSnap) is a flag or env var.

## When to use

- The project uses Storybook and wants a hosted UI for visual review with
  team sign-off on baseline changes.
- The team needs **TurboSnap** - a per-PR speedup that snapshots only
  stories whose dependency graph changed ([turbosnap][turbosnap]).
- The repo already has `chromatic` in `devDependencies` or a
  `chromatic.config.json` at the root.
- Visual coverage is story-driven, not full-page-driven (in contrast to
  Percy or Playwright snapshots, which are page-driven by default).

[turbosnap]: https://www.chromatic.com/docs/turbosnap/

## Authoring

### Install

```bash
npm install --save-dev chromatic
```

(Per the [Chromatic quickstart][quickstart].)

[quickstart]: https://www.chromatic.com/docs/quickstart/

### Connect to a project

The first run uploads the Storybook build, captures a snapshot of each
story, and **establishes those snapshots as the project baseline**
([quickstart][quickstart]):

```bash
npx chromatic --project-token <your-project-token>
```

Subsequent runs compare new snapshots to the baseline; visual changes
must be **explicitly accepted** in the Chromatic UI before the build
passes.

### Authoring stories (Storybook mode)

Chromatic snapshots whatever your Storybook indexes, so authoring is
"add a story." Per-story knobs that affect snapshots are passed in the
story's `parameters.chromatic` block (e.g. `modes`, `delay`, `pauseAnimationAtEnd`).

### Authoring tests (Playwright / Cypress mode)

When invoked with `--playwright` or `--cypress`, the CLI captures
snapshots from your existing Playwright / Cypress test runs
([cli][cli]); no per-test code changes are required beyond running the
matching framework's archive output through Chromatic.

[cli]: https://www.chromatic.com/docs/cli/

### Stories that change on every build: fix the source, not the threshold

A story that renders `new Date()`, `Math.random()`, live data or a
running animation produces a new diff on every build. Raising
`diffThreshold` to silence it makes every comparison less sensitive,
so real regressions pass too; the default is `0.063`
([threshold][threshold]). Make the input fixed instead:

| Source of change | Fix in the story or component |
|---|---|
| Current time ("2 minutes ago", today's date) | Pass a fixed timestamp as an arg, or mock `Date` in a decorator |
| Random colours, IDs, shuffled order | Derive them from the data (hash of a name), or seed the generator |
| Network data | Fixture args or a request mock, never a live API |
| CSS animations and transitions | Chromatic pauses them at the end of the cycle; set `pauseAnimationAtEnd: false` to capture the first frame instead ([animations][animations]) |
| JavaScript animations (`requestAnimationFrame`, timers, animation libraries) | Chromatic does not control them; branch on `isChromatic()` and render the final state ([animations][animations]) |

```tsx
import isChromatic from 'chromatic/isChromatic';

export function ProgressRing({ value }: { value: number }) {
  const [shown, setShown] = useState(isChromatic() ? value : 0);
  useEffect(() => {
    if (isChromatic()) return;            // snapshot shows the final value
    const id = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(id);
  }, [value]);
  return <svg aria-label={`${shown}%`}>{/* ... */}</svg>;
}
```

Do not paper over it with a long `delay` or by disabling snapshots for
the story: the first only moves the race, the second removes the
coverage. After the fix, put `diffThreshold` back to the default.

### Themes and viewports: modes

Modes replace the older per-story `chromatic.viewports` parameter. A
mode is a named combination of globals (viewport, theme, locale), and
"Chromatic treats each mode as an individual entity, with its own
unique baselines and specific approvals" ([modes][modes]). Define them
once in `.storybook/modes.ts` and apply them in
`.storybook/preview.ts` so every story gets them:

```ts
// .storybook/modes.ts
export const allModes = {
  'compact light': { viewport: 'compact', theme: 'light' },
  'compact dark':  { viewport: 'compact', theme: 'dark' },
  'wide light':    { viewport: 'wide', theme: 'light' },
  'wide dark':     { viewport: 'wide', theme: 'dark' },
} as const;
```

```ts
// .storybook/preview.ts
import { allModes } from './modes';

const preview = {
  parameters: {
    viewport: {
      options: {                         // Storybook 9 viewport options
        compact: { name: 'Compact', styles: { width: '390px', height: '844px' } },
        wide:    { name: 'Wide',    styles: { width: '1280px', height: '800px' } },
      },
    },
    chromatic: { modes: allModes },
  },
  initialGlobals: { theme: 'light' },   // read by a theme decorator
};
export default preview;
```

- Use the same keys in the modes as in the viewport `options`
  (`compact`, `wide` above); the `options` object needs Storybook 9,
  and modes need Storybook 6.0 or later ([modes][modes]).
- The theme global only changes the snapshot if a decorator or addon
  reads it and switches the theme.
- Each mode is a separate snapshot of every story: four modes mean
  four snapshots per story, each with its own baseline and approval.
  Override `parameters.chromatic.modes` per story to drop modes a
  story does not need.

[threshold]: https://www.chromatic.com/docs/threshold/
[animations]: https://www.chromatic.com/docs/animations/
[modes]: https://www.chromatic.com/docs/modes/

## Running

### CLI invocation

The canonical invocation in CI, with the token sourced from an env var
([cli][cli]):

```bash
export CHROMATIC_PROJECT_TOKEN=<token>
npx chromatic
```

Useful flags ([cli][cli]):

| Flag                     | Effect |
|--------------------------|--------|
| `--project-token <t>`    | Override the token (env var preferred). |
| `--playwright`           | Capture from Playwright runs instead of Storybook. |
| `--cypress`              | Capture from Cypress runs instead of Storybook. |
| `--only-changed`         | Enable TurboSnap (snapshot only stories affected by changed files). |
| `--only-story-names`     | Run a build limited to specific story names. |
| `--auto-accept-changes`  | Auto-accept changes on the named branch (typically used on `main` for the first run after a planned UI overhaul). |
| `--exit-zero-on-changes` | Exit `0` on visual changes (still uploads, but the CI step doesn't fail). |
| `--exit-once-uploaded`   | Return as soon as the upload completes; do not wait for the snapshot pass. |
| `--dry-run`              | Skip publishing; useful for local debugging. |
| `--no-interactive`       | CI-style logging when running locally. |
| `--trace-changed`        | Show the TurboSnap dependency tree (debug). |
| `--list`                 | Print the indexed stories without running them. |
| `--debug`                | Verbose logging. |
| `--diagnostics-file <p>` | Write a JSON diagnostics dump for support. |

### Configuration file

`chromatic.config.json` at the project root - config keys mirror the CLI
flags converted to `kebab-case` ([cli][cli]):

```json
{
  "$schema": "https://www.chromatic.com/config-file.schema.json",
  "onlyChanged": true,
  "exitZeroOnChanges": false,
  "autoAcceptChanges": "main",
  "externals": ["public/**", "tokens/**"]
}
```

`externals` lists glob patterns of non-bundled files that should still
trigger a TurboSnap rebuild when changed (e.g. design tokens, static
assets) ([turbosnap][turbosnap]).

## Reading exit codes

Per the [Chromatic CLI docs][cli], exit codes carry semantic meaning - 
the gate logic should treat *visual changes* (1) differently from
*system errors* (3, 21 - 23, 101 - 105, 201 - 220):

| Code     | Meaning                                       |
|---------:|-----------------------------------------------|
| `0`      | Success.                                      |
| `1`      | Build has visual changes (review required).   |
| `2`      | Build has component (Storybook) errors.       |
| `3`      | Build failed (system error).                  |
| `4`      | No stories found.                             |
| `5` - `6`  | Build limited / canceled.                     |
| `11` - `12`| Account quota / payment issues.               |
| `21` - `23`| Storybook build / load failures.              |
| `101` - `105` | Git or dependency issues.                  |
| `201` - `220` | Network / API errors.                      |
| `254` - `255` | Invalid options / unknown error.           |

Use `--exit-zero-on-changes` only when changes are reviewed in the
Chromatic UI (not in CI) and you want CI to remain green pending
review.

## TurboSnap

TurboSnap analyzes git history and the bundler dependency graph to
identify stories affected by a PR's changes; only those stories are
snapshotted, and the rest copy their baseline forward ([turbosnap][turbosnap]).

Enable via `--only-changed` (CLI) or `onlyChanged: true`
(`chromatic.config.json`).

### Bundler requirements

- **Webpack:** Chromatic reads the stats file emitted by Webpack.
- **Vite:** Vite also supplies a compatible dependency graph.

(Per [turbosnap][turbosnap].)

### Full-rebuild triggers

TurboSnap conservatively snapshots **everything** when any of these
change ([turbosnap][turbosnap]):

- `package.json` changes without a valid lockfile.
- Storybook config (`main.js`, `manager.js`).
- `preview.js` imports.
- Static folders.
- Infrastructure upgrades (Storybook major version, etc.).

Merge commits also trigger conservative re-testing because TurboSnap
cannot know ahead of time which baseline side to compare against
([turbosnap][turbosnap]).

## CI integration

The minimal pattern is: install `chromatic`, expose
`CHROMATIC_PROJECT_TOKEN` as a CI secret, run the CLI, fail the job on
exit `!= 0` (or `!= 0,1` if review happens in the Chromatic UI).

```yaml
# .github/workflows/chromatic.yml
name: chromatic

on:
  pull_request:
  push:
    branches: [main]

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0   # required by TurboSnap

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci

      - name: Build Storybook + run Chromatic
        env:
          CHROMATIC_PROJECT_TOKEN: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
        run: npx chromatic --only-changed
```

`fetch-depth: 0` is required so TurboSnap can resolve the
PR-vs-baseline commit ancestry ([turbosnap][turbosnap]).

## References

- [chromatic-overview][overview] - product overview, framework support.
- [chromatic-quickstart][quickstart] - install + first-run baseline.
- [chromatic-cli][cli] - full CLI flag set + exit codes + config schema.
- [chromatic-turbosnap][turbosnap] - TurboSnap mechanism, full-rebuild
  triggers, bundler requirements.
- [chromatic-threshold][threshold] - `diffThreshold` and its default.
- [chromatic-animations][animations] - CSS animations paused at the
  end, `pauseAnimationAtEnd`, `isChromatic()` for JavaScript animations.
- [chromatic-modes][modes] - modes file, project-wide modes, per-mode
  baselines.
