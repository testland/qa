# Bug-spec render template

`render_body(failure, env)` produces this Markdown block, consumed verbatim by
every platform runner. Placeholders in `<...>` are filled from the parsed
failure and the CI environment variables.

```markdown
## Test failure

**Test:** `<class>::<test>`
**Suite:** <suite>
**Duration:** <duration> s
**Environment:** <env from CI vars: branch, commit, OS, browser>

### Assertion

```
<failure.message>
```

### Stack trace

```
<failure.stack>
```

### Artefacts

- Screenshot: <link or attachment ref>
- Video: <link>
- HAR: <link>
- CI run: <link>
- Test source: <github permalink at commit sha>

### Classification (proposed - triager to confirm)

| Field | Value |
|---|---|
| Severity | <inferred> |
| Priority | <inferred> |
| Defect type (IEEE 1044) | <inferred> |
| Root cause (CTAL-TA) | (triager to assign) |
| Component | <inferred> |
| Suite | <inferred> |

### Reproduction

1. Check out `<commit>`
2. Run: `<command>`
3. Observe: <one-line description>

### History

<dupe-search result: any prior occurrences of this test failing in last N days>
```
