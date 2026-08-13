# Team config (settings.json) - the secondary path

The recommended way to adopt a role is a **[role bundle](../README.md#install)** - 
one command installs the whole set:

```
/plugin install qa-role-security@testland-qa
```

This directory documents the **secondary** path: enabling a curated set in a
committed `.claude/settings.json` instead of installing interactively. Reach for
it only when you need to:

- share an enabled set with a whole team through version control (project scope), or
- enable a set non-interactively - in CI, or on Claude Code older than v2.1.143,
  where installing a bundle pulls in its members but may not enable them in one step.

## How

Add the marketplace and the member plugins of the role you want to
`.claude/settings.json` (or `~/.claude/settings.json` for user scope). The member
list for each role is the `dependencies` array in that bundle's manifest
(`plugins/<bundle>/.claude-plugin/plugin.json`) - that manifest is the single
source of truth, so this path never drifts from the bundles. Example for the
security role:

```json
{
  "extraKnownMarketplaces": {
    "testland-qa": { "source": { "source": "github", "repo": "testland/qa" } }
  },
  "enabledPlugins": {
    "qa-security-scanning@testland-qa": true,
    "qa-fuzz-testing@testland-qa": true,
    "qa-compliance@testland-qa": true,
    "qa-multi-tenancy@testland-qa": true,
    "qa-test-data-privacy@testland-qa": true,
    "qa-iac@testland-qa": true
  }
}
```

Trust the folder, then restart (or run `/reload-plugins`). For everything except
this CI / shared-team case, prefer the one-command bundle install above.
