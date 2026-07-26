# Node report renderer: multiple-cucumber-html-reporter

Renders Cucumber JSON into a stakeholder HTML report for any Cucumber-JS
project. Referenced from [living-documentation-publisher](../SKILL.md) Step 2.

## Install

Install the reporter as a dev dependency
([multiple-cucumber-html-reporter installation][mchr-install]):

```bash
npm install multiple-cucumber-html-reporter --save-dev
```

## Timestamped JSON for parallel shards

Use a timestamped filename when running parallel shards to avoid overwrite
([multiple-cucumber-html-reporter usage][mchr-usage]):

```bash
cucumber-js features/ \
  --format json:reports/cucumber-$(date +%s).json
```

## Generate the report

Create `scripts/generate-report.js`:

```javascript
const report = require("multiple-cucumber-html-reporter");

report.generate({
  // required
  jsonDir: "./reports/",
  reportPath: "./docs/living-documentation/",

  // identification metadata shown in the report header
  metadata: {
    browser: { name: "chrome", version: "latest" },
    device: "CI runner",
    platform: { name: "linux", version: "22.04" }
  },

  // custom info block (release, project, branch)
  customData: {
    title: "Run info",
    data: [
      { label: "Project", value: "Checkout Service" },
      { label: "Release", value: process.env.RELEASE_TAG || "dev" }
    ]
  },

  // display options
  reportName:      "Checkout Service - Living Documentation",
  pageTitle:       "Acceptance Criteria Status",
  displayDuration: true,
  durationInMS:    true
});
```

Run it after the test step ([multiple-cucumber-html-reporter usage][mchr-usage]):

```bash
npm test && node scripts/generate-report.js
```

## Options

Key options from the official docs ([multiple-cucumber-html-reporter options][mchr-opts]):

| Option | Type | Default | Purpose |
|---|---|---|---|
| `jsonDir` | String | required | Directory of Cucumber JSON files |
| `reportPath` | String | required | Output directory for the HTML report |
| `reportName` | String | | Title displayed in the UI |
| `pageTitle` | String | `"Multiple Cucumber HTML Reporter"` | HTML `<head>` title |
| `displayDuration` | Boolean | `false` | Show step/scenario timing |
| `durationInMS` | Boolean | `false` | Interpret step durations as ms not ns |
| `saveCollectedJSON` | Boolean | `false` | Keep merged JSON for debugging |
| `customStyle` | Path | | Append a CSS file for brand colours |
| `overrideStyle` | Path | | Replace all default CSS |

## Sources

- [mchr-install][mchr-install] - installation: npm/yarn/pnpm, CucumberJS version compatibility matrix.
- [mchr-usage][mchr-usage] - usage: `AfterFeatures` hook (CucumberJS 2.x) vs. separate post-test script (3.x+), timestamped JSON filenames.
- [mchr-opts][mchr-opts] - options: `jsonDir`, `reportPath`, `reportName`, `pageTitle`, `displayDuration`, `durationInMS`, `saveCollectedJSON`, `customStyle`, `overrideStyle` full option table.

[mchr-install]: https://multiple-cucumber-html-reporter.vercel.app/docs/installation
[mchr-usage]: https://multiple-cucumber-html-reporter.vercel.app/docs/usage
[mchr-opts]: https://multiple-cucumber-html-reporter.vercel.app/docs/options
