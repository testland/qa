# Per-tool diff-data sources

Where each visual tool exposes per-snapshot diff data for `SKILL.md` Step 1
to consume. This skill is downstream of the per-tool wrappers.

| Tool | Where the diff data lives |
|------|---------------------------|
| Percy (BrowserStack) | Build API: `GET /api/v1/builds/<id>/snapshots`; per-snapshot `diff_ratio`. |
| Chromatic | `chromatic --dry-run` JSON; `--exit-zero-on-changes` build summary. |
| Playwright `toHaveScreenshot` | Test reporter output; failed expectations include attached image diffs. |
| Storybook test-runner | Per-story coverage diff via `@storybook/test-runner`'s snapshot mode. |
| Loki / BackstopJS | JSON report with per-scenario `misMatchPercentage`. |

The upstream tool wrappers in `qa-visual-regression` (`percy-visual-regression-testing`, `chromatic-visual-regression-testing`, `playwright-snapshots`, `storybook-visual-regression-testing`) cover the per-tool integration and produce the output this skill consumes.
