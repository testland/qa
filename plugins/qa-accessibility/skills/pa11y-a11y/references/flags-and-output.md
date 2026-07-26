# pa11y CLI flags and output structure

## Key flags

| Flag                       | Effect                                                 |
|----------------------------|--------------------------------------------------------|
| `--reporter <name>`        | Output format: `cli` (default), `csv`, `json`, `html`, `tsv`. |
| `--standard <name>`        | WCAG standard: `WCAG2A`, `WCAG2AA` (default), `WCAG2AAA`. |
| `--include-warnings`       | Include warning-level issues (excluded by default).   |
| `--include-notices`        | Include notice-level issues.                            |
| `--ignore <rules>`         | Skip specific rules (comma-separated).                 |
| `--runner <name>`          | Choose engine: `htmlcs` (default) or `axe`.            |
| `--threshold <n>`          | Allow up to N issues before failing.                   |
| `--timeout <ms>`           | Page-load timeout.                                     |
| `--config <file>`          | Use a `.pa11yrc` config file.                          |

## Results structure

```json
{
  "documentTitle": "Example",
  "pageUrl": "https://example.com/",
  "issues": [
    {
      "code": "WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail",
      "type": "error",
      "typeCode": 1,
      "message": "This element has insufficient contrast at this conformance level.",
      "context": "<button>Submit</button>",
      "selector": "button.primary",
      "runner": "htmlcs"
    },
    {
      "code": "color-contrast",
      "type": "error",
      "typeCode": 1,
      "message": "Elements must meet minimum color contrast ratio thresholds",
      "context": "<button>Submit</button>",
      "selector": "button.primary",
      "runner": "axe"
    }
  ]
}
```

Note the **same issue from two engines** - htmlcs flags as
`WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail` (WCAG-SC-coded);
axe flags as `color-contrast` (rule-coded). Pipe through
`a11y-violation-gate` to deduplicate via the unified-record
`fingerprint` field.
