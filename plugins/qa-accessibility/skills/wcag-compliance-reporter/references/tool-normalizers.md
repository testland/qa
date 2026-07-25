# Per-tool normalizers and the SC mapping

Deep reference for `wcag-compliance-reporter` SKILL.md. Consult when writing or
updating a per-tool normalizer; SKILL.md Step 1 keeps only the `Violation`
contract and the concept and points here for the implementation.

Each scanner tags violations with its own WCAG hints, so each tool needs a small
normalizer that maps its native rule IDs to a WCAG Success Criterion. The
mapping is curated upstream:

- axe-core ships `tags` like `wcag2a`, `wcag143`.
- pa11y ships codes like `WCAG2AA.Principle1.Guideline1_4.1_4_3`.
- Lighthouse uses an internal mapping documented in its audit catalog.

## Worked normalizer - axe-core

```python
# scripts/normalize_axe.py
def normalize_axe(json_blob, page_url):
    out = []
    for violation in json_blob.get('violations', []):
        sc = sc_from_axe_tags(violation['tags'])  # e.g. "1.4.3"
        if not sc: continue
        for node in violation['nodes']:
            out.append({
                'page': page_url,
                'successCriterion': sc,
                'level': level_from_sc(sc),       # "1.4.3" → "AA"
                'ruleId': violation['id'],
                'selector': ' '.join(node['target']),
                'message': violation['help'],
                'helpUrl': violation['helpUrl'],
                'scanner': 'axe',
            })
    return out
```

## The central SC mapping

A single `sc-mapping.json` file holds rule-to-SC for every tool the report
consumes. Update it whenever a tool's rule catalog changes so a renamed or
newly-added rule keeps resolving to the right Success Criterion; a stale mapping
silently drops violations that no longer match a known rule ID.
