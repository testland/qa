# Role bundles (settings presets)

Installing 70+ plugins one command at a time is the wrong way to adopt this
marketplace. These presets let a whole **role** come online in one gesture.

Each file in this directory is a drop-in
[`.claude/settings.json`](https://code.claude.com/docs/en/settings#plugin-settings)
that registers the `testland-qa` marketplace and enables a curated set of
plugins for one role. Pick the bundle that matches what you work on; you can
always enable or disable individual plugins afterward.

## How to use a preset

1. Open the preset that matches your role (table below) and copy its contents.
2. Paste into your project's `.claude/settings.json`.
   - If you don't have that file yet, the preset *is* a valid `.claude/settings.json` — save it as-is.
   - If you already have one, merge the two keys (`extraKnownMarketplaces` and `enabledPlugins`) into your existing file rather than overwriting it.
3. Trust the folder when Claude Code prompts you, then restart the session (or run `/reload-plugins`). The marketplace registers and the listed plugins load.

```jsonc
// .claude/settings.json — e.g. the security-qa preset
{
  "extraKnownMarketplaces": {
    "testland-qa": { "source": { "source": "github", "repo": "testland/qa" } }
  },
  "enabledPlugins": {
    "qa-sast@testland-qa": true,
    "qa-dast@testland-qa": true
    // ...
  }
}
```

### Scope: shared vs. just-for-you

`.claude/settings.json` is **project scope** — committing it shares the bundle
with everyone on the repository, which is usually what a team wants. For a
personal setup that isn't shared:

- put the same keys in **`~/.claude/settings.json`** to enable the role across all your projects (user scope), or
- use **`.claude/settings.local.json`** to enable it for yourself in this repository only (local scope, git-ignored).

## Available bundles

| Preset | Role | Plugins |
|---|---|---:|
| [`frontend-web-qa`](frontend-web-qa.settings.json) | Frontend / web-app QA & automation | 7 |
| [`backend-api-qa`](backend-api-qa.settings.json) | Backend / API / microservices QA | 9 |
| [`security-qa`](security-qa.settings.json) | Application security tester / AppSec | 9 |
| [`performance-and-resilience-qa`](performance-and-resilience-qa.settings.json) | Performance / reliability engineer | 7 |
| [`data-qa`](data-qa.settings.json) | Data / analytics-pipeline QA | 6 |
| [`ai-ml-qa`](ai-ml-qa.settings.json) | ML / LLM application QA | 5 |
| [`mobile-and-cross-platform-qa`](mobile-and-cross-platform-qa.settings.json) | Mobile / desktop / cross-platform | 6 |
| [`test-leadership`](test-leadership.settings.json) | QA lead / manager / head of quality | 8 |
| [`manual-and-exploratory-qa`](manual-and-exploratory-qa.settings.json) | Manual / exploratory / UAT tester | 5 |
| [`polyglot-unit-and-coverage`](polyglot-unit-and-coverage.settings.json) | Unit + coverage across the language stack | 8 |

## Notes

- **Bundles are a starting point, not a requirement.** Enabling a role you
  actually work in keeps things sharp; enabling everything adds baseline
  [context cost](https://code.claude.com/docs/en/features-overview#understand-context-costs)
  every turn. Trim any plugin you don't need — each line in `enabledPlugins`
  is independent.
- A plugin can appear in more than one bundle (e.g. `qa-test-data-privacy` is in
  both `security-qa` and `data-qa`); enabling it from two presets is harmless.
- Prefer to dip a toe first? The [main README "Start here"](../README.md#start-here)
  lists one or two plugins per role instead of a whole bundle.
