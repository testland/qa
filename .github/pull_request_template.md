## Summary

<!-- 1–2 sentences: what this PR adds, modifies, or removes. -->

## Plugin(s) touched

<!-- e.g. plugins/qa-data-quality, plugins/qa-sast -->

## Component checklist

For each new or modified component (skill / agent):

- [ ] Frontmatter complete: `name`, `description`, `rating`, `d6`
- [ ] `description` follows the single-description test (third-person, no "You are…" / "I help…", distinguishes vs neighbors)
- [ ] `rating` ≥ 21
- [ ] `d6` ≥ 1 — every concrete claim cited inline at point of use (no end-of-body References-only blocks)
- [ ] Body structure matches one of the common component shapes (see [`docs/PLUGIN_AUTHORING.md`](../docs/PLUGIN_AUTHORING.md) "Common component shapes")
- [ ] Differentiation axis documented vs. 2–3 nearest neighbors (see [`docs/CONTRIBUTING.md`](../docs/CONTRIBUTING.md) "Differentiation requirement")

## Plugin manifest

- [ ] If files inside `plugins/<name>/` changed, the plugin's `version` in
      `plugins/<name>/.claude-plugin/plugin.json` was bumped
- [ ] If a new plugin was added, it appears in `.claude-plugin/marketplace.json`

## Local validation passed

```bash
bash scripts/validate.sh .
bash scripts/rating-check.sh .
python3 scripts/composition-graph.py
```

- [ ] all three exit 0

## Sources fetched

<!-- For new components, list the canonical URLs you fetched while authoring,
     and the date you fetched them. This is the d6 grounding evidence. -->

## Reviewer notes

<!-- Anything reviewers should pay extra attention to. -->
