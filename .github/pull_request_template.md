## Summary

<!-- 1–2 sentences: what this PR adds, modifies, or removes. -->

## Plugin(s) touched

<!-- e.g. plugins/qa-data-quality, plugins/qa-security-scanning -->

## D1–D6 review (manual)

New and changed components are validated by **reading this PR** against the
six-dimension rubric — there is no automated rating gate and no `rating` / `d6`
frontmatter. Full anchors: [`docs/REVIEWER_CHECKLIST.md`](../docs/REVIEWER_CHECKLIST.md).

- [ ] **D1 Spec compliance** — frontmatter valid (kebab-case `name`, third-person `description`); `npm run validate` passes.
- [ ] **D2 Scope quality** — one coherent scope, single responsibility, progressive disclosure.
- [ ] **D3 Description quality** — distinguishes vs the 2–3 nearest neighbors; predicts the body.
- [ ] **D4 Use-case fit** — explicit "Use when…" trigger, not a persona.
- [ ] **D5 Body quality** — concrete steps + worked examples.
- [ ] **D6 Terminology / citations (hard floor)** — every concrete claim, flag, and threshold verifiable against a fetched canonical source, inline or in a checked References/Sources section. Content with no canonical source anywhere is a hard reject.
- [ ] Differentiation axis documented vs. 2–3 nearest neighbors (see [`docs/CONTRIBUTING.md`](../docs/CONTRIBUTING.md) "Differentiation requirement").

## Plugin manifest

- [ ] If files inside `plugins/<name>/` changed, the plugin's `version` in `plugins/<name>/.claude-plugin/plugin.json` was bumped (required — see [`CLAUDE.md`](../CLAUDE.md) "Version bumps are mandatory").
- [ ] If a new plugin was added, it appears in `.claude-plugin/marketplace.json`, and `CATALOG.md` was regenerated.
- [ ] testland-web resynced if a plugin/version changed (version parity).

## Local validation passed

```bash
npm ci
npm run typecheck && npm test
npm run validate && npm run compose
npm run catalog && npm run evals:check && npm run audit && npm run drift
npm run version-check
```

- [ ] all exit 0

## Sources fetched

<!-- For new components, list the canonical URLs you fetched while authoring, and
     the date — this is the D6 grounding evidence a reviewer checks. -->

## Reviewer notes

<!-- Anything reviewers should pay extra attention to. -->
