---
name: graphql-schema-regression
description: "Diffs two GraphQL schemas with `graphql-inspector diff`, classifies each change as BREAKING / DANGEROUS / NON_BREAKING, and applies opt-in rules (suppress-removal-of-deprecated-field, consider-usage, ignore-description-changes) to gate CI on schema regressions. Use when reviewing GraphQL schema changes in a PR or evaluating Federation supergraph drift."
---

# graphql-schema-regression

## Overview

GraphQL Inspector is a schema-management CLI from The Guild that
validates GraphQL schemas and detects changes between two versions
([gqi-overview][overview]). It classifies every change into one of
three tiers ([gqi-diff][diff]):

| Classification | Meaning                                                            |
|----------------|--------------------------------------------------------------------|
| **Breaking**   | Will disrupt existing clients (removed fields, narrowed types).    |
| **Dangerous**  | Won't immediately break clients but may cause issues (e.g. union member added). |
| **Non-breaking** | Safe additions (new fields on existing types, new types).        |

[overview]: https://the-guild.dev/graphql/inspector
[diff]: https://the-guild.dev/graphql/inspector/docs/essentials/diff

The tool exits non-zero when breaking changes exist, exits zero
otherwise - the gate is the exit code.

This is the GraphQL-specific counterpart to
[`openapi-contract-diff`](../openapi-contract-diff/SKILL.md). Use it
when the API surface is GraphQL (single schema or Apollo Federation
supergraph) instead of REST.

## When to use

- The repo defines a GraphQL schema (`schema.graphql`, an SDL string in
  code, or a Federation subgraph).
- The team wants a CI gate on schema regressions between the PR and
  the deployed schema.
- The team uses **deprecated field tracking** (`@deprecated`) and
  wants `suppressRemovalOfDeprecatedField` semantics - i.e. removing a
  field that has been marked `@deprecated` long enough is acceptable,
  removing a non-deprecated field is not.
- The schema is part of a Federation supergraph and you need to gate
  per-subgraph regressions.

## Install

```bash
npm install --global @graphql-inspector/cli
```

(Per [gqi-overview][overview].)

For ad-hoc CI use, prefer running it via `npx @graphql-inspector/cli`
without a global install.

## Running

### Local diff between two schema files

```bash
graphql-inspector diff schema.old.graphql schema.new.graphql
```

(Per [gqi-diff][diff].)

The command supports SDL files, introspection result JSON, GitHub
URLs, and live endpoints - when passing an endpoint use the `--header`
flag to attach an auth token.

### Comparing against the deployed schema

```bash
# Pull the production schema first
graphql-inspector introspect https://api.example.com/graphql > schema.prod.graphql

# Diff against the local SDL
graphql-inspector diff schema.prod.graphql schema.graphql
```

### Output

The default output is human-readable, grouped by classification. Find
breaking changes, dangerous changes, and non-breaking changes printed
under separate headings.

For machine consumption, the JSON-output GitHub Action
(`kamilkisiela/graphql-inspector` or
`@graphql-inspector/github-action`) produces a structured report; for
arbitrary CI, parse the human-readable output via grep on the
classification headings.

## Rules

`graphql-inspector diff` accepts `--rule` flags to customize the gate
([gqi-diff][diff]):

| Rule                                      | Effect |
|-------------------------------------------|--------|
| `dangerousBreaking`                       | Treat dangerous changes as breaking (stricter). |
| `suppressRemovalOfDeprecatedField`        | Removing a `@deprecated` field is non-breaking. |
| `ignoreDescriptionChanges`                | Don't flag pure description / docstring edits. |
| `safeUnreachable`                         | Treat changes to unreachable parts of the graph as safe. |
| `considerUsage`                           | Use real-client usage data (Apollo Studio, etc.) to grade severity. |

Custom rules live as JS modules:

```bash
graphql-inspector diff old.graphql new.graphql --rule './rules/our-custom.js'
```

A custom rule exports a function `({ changes }) => filteredChanges` - 
useful when the team has a project-specific severity policy
(e.g. "removing any field under `internalAdmin*` is non-breaking").

## CI integration

### GitHub Actions - minimal

```yaml
# .github/workflows/graphql-diff.yml
name: graphql-schema-diff

on:
  pull_request:
    paths:
      - 'schema.graphql'
      - '**/*.graphql'

jobs:
  inspector:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Extract base schema
        run: |
          BASE_SHA=$(git merge-base origin/main HEAD)
          git show $BASE_SHA:schema.graphql > /tmp/schema-base.graphql

      - name: Diff
        run: |
          npx @graphql-inspector/cli diff \
            /tmp/schema-base.graphql \
            schema.graphql \
            --rule suppressRemovalOfDeprecatedField \
            --rule ignoreDescriptionChanges
```

The `--rule suppressRemovalOfDeprecatedField` is the canonical pattern
for projects that take deprecation seriously: removing a field with
`@deprecated` is allowed; removing a live field blocks the PR.

### Federation supergraphs

For Apollo Federation, run `graphql-inspector diff` once per subgraph,
not against the supergraph composite - the composite includes all
subgraph types and a single subgraph PR's "added type" would appear as
"already present" on the composite side.

```bash
# For each subgraph in the PR
for subgraph in subgraphs/*/schema.graphql; do
  echo "Checking $subgraph"
  graphql-inspector diff "/tmp/${subgraph#subgraphs/}-base" "$subgraph"
done
```

Pair the per-subgraph diff with `rover supergraph compose` (Apollo's
official CLI) to confirm the composition still produces a valid
supergraph after the PR's changes.

## Alternatives noted (out of scope)

- **`graphql-cli`** - older umbrella tool; superseded by `@graphql-inspector/cli`.
- **Apollo `rover graph check`** - Apollo Studio's hosted equivalent;
  use this when the project is on Apollo Studio for the usage-based
  `considerUsage` analog.

This skill stays focused on `graphql-inspector` because it's the
self-hosted, vendor-neutral default.

## References

- [gqi-overview][overview] - GraphQL Inspector landing page; install
  command.
- [gqi-diff][diff] - `diff` CLI semantics, change classifications,
  rule flags.
- [`openapi-contract-diff`](../openapi-contract-diff/SKILL.md) - REST
  counterpart for OpenAPI.
- [`contract-compatibility-gate`](../contract-compatibility-gate/SKILL.md) - gate skill that aggregates this output with Pact / oasdiff verdicts.
