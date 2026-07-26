# axe-core results structure and rule configuration

## Results structure

`axe.run()` resolves to an object with four arrays ([axe-core][readme]):

| Field          | Meaning                                                       |
|----------------|---------------------------------------------------------------|
| `violations`   | Definite issues - block this in CI.                          |
| `incomplete`   | Items needing human review (axe couldn't determine).        |
| `passes`       | Successful checks.                                            |
| `inapplicable` | Rules that don't apply to this page.                         |

Each violation has:

| Field          | Meaning                                                       |
|----------------|---------------------------------------------------------------|
| `id`           | Rule ID (e.g. `color-contrast`, `label`, `aria-required-attr`). |
| `impact`       | `critical` / `serious` / `moderate` / `minor`.                |
| `tags`         | Includes `wcag2a`, `wcag22aa`, etc. - for severity-by-SC tagging. |
| `description`  | One-line explanation.                                         |
| `help`         | Longer remediation guidance.                                  |
| `helpUrl`      | Direct link to Deque's rule documentation.                    |
| `nodes`        | Array of failing elements with `target` (selector), `html`, `failureSummary`. |

Triage with `jq`:

```bash
# Top violations by impact
jq -r '.violations[] | "\(.impact): \(.id) - \(.description)"' axe-results.json

# Just the failing selectors per rule
jq -r '.violations[] | "\(.id):", (.nodes[].target | tostring)' axe-results.json
```

## Rule configuration

### By tags

axe ships rules tagged with conformance levels:

```javascript
new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
```

Common tag sets:

| Tag set                                                    | Coverage                         |
|------------------------------------------------------------|----------------------------------|
| `['wcag2a', 'wcag2aa']`                                     | WCAG 2.0/2.1 A + AA. Default for most teams. |
| `['wcag2a', 'wcag2aa', 'wcag22aa']`                          | Adds WCAG 2.2 AA criteria.       |
| `['wcag2aaa']`                                              | AAA-only (rarely the gate).      |
| `['best-practice']`                                          | Non-WCAG good practices.         |
| `['experimental']`                                          | Beta rules.                      |

### Disable specific rules

```javascript
new AxeBuilder({ page }).disableRules(['color-contrast'])
```

For per-page disabling (e.g. a known false positive on a specific
component):

```javascript
new AxeBuilder({ page })
  .exclude('.legacy-component')   // selector exclusion
  .analyze();
```

For per-rule severity in CI gating (e.g. block on `critical` /
`serious` only): handle in `a11y-violation-gate` using the `impact`
field.

[readme]: https://github.com/dequelabs/axe-core
