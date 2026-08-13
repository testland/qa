# Cobertura XML - parsing, gating, and cross-tool normalization

Reference detail for [lcov-analysis](../SKILL.md): the sibling Cobertura XML
format, with the same PR-gating shape as LCOV but a different parser.

Cobertura is "a free Java tool that calculates the percentage of code
accessed by tests" ([cobertura-home][cob-home]). Its XML report format -
sometimes called **coverage-04.dtd** after its DTD - became the de-facto JVM
coverage interchange and is now emitted by JaCoCo, coverage.py (`--xml`),
Jest's `cobertura` reporter, Istanbul, gocover-cobertura, .NET's `coverlet`,
and many CI plugins.

[cob-home]: https://cobertura.github.io/cobertura/
[cob-dtd]: https://github.com/cobertura/cobertura/blob/master/cobertura/src/site/htdocs/xml/coverage-04.dtd

## Schema (coverage-04.dtd)

Per [cobertura-dtd][cob-dtd], the DTD declares this hierarchy:

```
coverage
├── sources*           (paths the report is rooted at)
└── packages
    └── package*       (one per package; in non-Java languages, often per-directory)
        └── classes
            └── class*      (one per file, despite the name)
                ├── methods
                │   └── method*
                │       └── lines/line*
                └── lines
                    └── line*  (line | condition)
```

Required attributes per [cobertura-dtd][cob-dtd]:

| Element     | Required attributes                                                                                              |
|-------------|------------------------------------------------------------------------------------------------------------------|
| `coverage`  | `line-rate`, `branch-rate`, `lines-covered`, `lines-valid`, `branches-covered`, `branches-valid`, `complexity`, `version`, `timestamp` |
| `package`   | `name`, `line-rate`, `branch-rate`, `complexity`                                                                 |
| `class`     | `name`, `filename`, `line-rate`, `branch-rate`, `complexity`                                                     |
| `method`    | `name`, `signature`, `line-rate`, `branch-rate`, `complexity`                                                    |
| `line`      | `number`, `hits`, plus `branch="false"` (default) and `condition-coverage="100%"` (default)                      |

Two important nuances:

- **`line-rate` and `branch-rate` are decimals 0 - 1**, not
  percentages. `0.85` = 85%.
- **`class` is a misnomer** - it usually maps to one source file.
  Non-Java emitters set `name = filename` for clarity.

## Sample document

```xml
<?xml version="1.0" ?>
<!DOCTYPE coverage SYSTEM "http://cobertura.sourceforge.net/xml/coverage-04.dtd">
<coverage line-rate="0.78" branch-rate="0.62" lines-covered="156" lines-valid="200"
          branches-covered="31" branches-valid="50" complexity="0" version="2.1.1" timestamp="1715000000">
  <sources>
    <source>src</source>
  </sources>
  <packages>
    <package name="checkout" line-rate="0.92" branch-rate="0.83" complexity="0">
      <classes>
        <class name="cart.ts" filename="checkout/cart.ts" line-rate="0.88" branch-rate="0.75" complexity="0">
          <methods>
            <method name="addItem" signature="(Item)V" line-rate="1.0" branch-rate="1.0" complexity="0">
              <lines><line number="11" hits="42"/></lines>
            </method>
          </methods>
          <lines>
            <line number="11" hits="42"/>
            <line number="12" hits="42"/>
            <line number="13" hits="42" branch="true" condition-coverage="50% (1/2)"/>
            <line number="33" hits="0"/>
          </lines>
        </class>
      </classes>
    </package>
  </packages>
</coverage>
```

The `SYSTEM` DOCTYPE URL above no longer resolves, but emitters
still write that exact literal - see the hardcoded string in
[istanbul-reports' cobertura reporter](https://github.com/istanbuljs/istanbuljs/blob/main/packages/istanbul-reports/lib/cobertura/index.js) -
so keep it in fixtures and disable external-entity resolution when
parsing. A live copy of the DTD text is at
[raw.githubusercontent.com/cobertura/web](https://raw.githubusercontent.com/cobertura/web/master/htdocs/xml/coverage-04.dtd).

The `condition-coverage` attribute on a branch line ("50% (1/2)")
means one of two branch arms was hit. Parse it as
`/(\d+(?:\.\d+)?)% \((\d+)\/(\d+)\)/` to extract `(pct, hit, total)`.

## Parse

```python
# scripts/parse_cobertura.py
import re
import xml.etree.ElementTree as ET

CC_RE = re.compile(r'(\d+(?:\.\d+)?)% \((\d+)/(\d+)\)')

def parse_cobertura(path):
    root = ET.parse(path).getroot()
    files = []
    for pkg in root.findall('packages/package'):
        for cls in pkg.findall('classes/class'):
            lines = []
            for ln in cls.findall('lines/line'):
                hit = int(ln.get('hits', '0'))
                line_data = {'number': int(ln.get('number')), 'hits': hit}
                if ln.get('branch') == 'true':
                    cc = CC_RE.match(ln.get('condition-coverage', '0% (0/0)'))
                    if cc:
                        pct, br_hit, br_total = cc.groups()
                        line_data['branch'] = {
                            'pct': float(pct), 'hit': int(br_hit), 'total': int(br_total),
                        }
                lines.append(line_data)
            files.append({
                'package': pkg.get('name'),
                'name': cls.get('name'),
                'filename': cls.get('filename'),
                'line_rate': float(cls.get('line-rate')),
                'branch_rate': float(cls.get('branch-rate')),
                'lines': lines,
            })
    return {
        'overall': {
            'line_rate': float(root.get('line-rate')),
            'branch_rate': float(root.get('branch-rate')),
            'lines_covered': int(root.get('lines-covered')),
            'lines_valid': int(root.get('lines-valid')),
            'branches_covered': int(root.get('branches-covered')),
            'branches_valid': int(root.get('branches-valid')),
        },
        'files': files,
    }
```

## Diff vs baseline + gate

The same shape as the LCOV baseline-diff in the parent SKILL - pivot on
`filename`, compute deltas, apply the per-file + whole-repo gate rules:

```python
def diff(current, baseline):
    base = {f['filename']: f for f in baseline['files']}
    out = []
    for f in current['files']:
        b = base.get(f['filename'])
        out.append({
            'filename': f['filename'],
            'line_now':  f['line_rate']   * 100,
            'line_then': b['line_rate']   * 100 if b else None,
            'branch_now':  f['branch_rate']  * 100,
            'branch_then': b['branch_rate']  * 100 if b else None,
            'is_new': b is None,
        })
    return out
```

## Cross-tool normalization

When the team has Cobertura from one language and LCOV from another,
emit a normalized intermediate (file → line% → branch% → uncovered
line list) that both parsers feed:

```python
def normalize_cobertura(parsed):
    return [
        {
            'path': f['filename'],
            'line_pct': f['line_rate'] * 100,
            'branch_pct': f['branch_rate'] * 100,
            'uncovered_lines': [ln['number'] for ln in f['lines'] if ln['hits'] == 0],
        }
        for f in parsed['files']
    ]
```

The downstream gate / reporter consumes the normalized shape,
language-agnostic.

## CI shape

```yaml
# Java with JaCoCo emitting Cobertura
- run: ./mvnw -B verify
- run: |
    # JaCoCo's Cobertura output (via maven-jacoco-plugin's report goal):
    cat target/site/jacoco/cobertura.xml > coverage.xml

# Python with coverage.py
- run: |
    coverage run -m pytest
    coverage xml -o coverage.xml

# JavaScript with Jest
- run: npx jest --coverage --coverageReporters=cobertura

# Then parse + gate (same shape regardless of upstream)
- run: python scripts/parse_cobertura.py coverage.xml > current.json
- run: python scripts/coverage_gate.py current.json baseline.json
```

## Anti-patterns

| Anti-pattern                                                       | Why it fails                                                                  | Fix |
|--------------------------------------------------------------------|-------------------------------------------------------------------------------|-----|
| Treating `line-rate` as a percentage                                | The DTD specifies decimal 0 - 1 ([cobertura-dtd][cob-dtd]); code mistakes 0.85 for 85 / 100 mid-pipeline. | Multiply by 100 only in display layer; preserve decimal in storage. |
| Pivoting on `class@name` instead of `class@filename`                 | "name" can be a Java FQCN that overlaps two physical files (inner classes).   | Pivot on `filename`. |
| Ignoring `condition-coverage`                                        | Branch coverage drops invisible; line% looks fine while branch% degrades.     | Parse the `pct (hit/total)` form; gate branch% separately. |
| Mixing Cobertura + LCOV without normalization                       | Branch coverage definitions differ; cross-tool sums lie.                      | Normalize first (above). |
| Using `coverage` root's summary blindly                              | Some emitters miscompute the summary on multi-package merges.                | Recompute by summing `lines-covered` / `lines-valid` from all `class` records. |
| Loading multi-100MB XML with `ET.parse`                              | Whole-tree-in-memory; OOM on large reports.                                   | `ET.iterparse` for streaming + element clearing. |
| Assuming `package@name` == JVM package                              | Non-Java emitters use it for directory paths or arbitrary labels.            | Treat `package@name` as a label only; group by `filename`. |

## Limitations

- **DTD is permissive.** Some emitters omit the `<methods>` block;
  some omit `<sources>`; some emit `complexity="0"` regardless.
  Tolerant parsing is required.
- **Per-condition vs per-decision branch reporting varies.** JaCoCo
  reports per-condition; coverage.py reports per-decision. Don't
  compare branch% across emitters without flagging the difference.
- **No native PR / commit / VCS metadata.** The format is a snapshot
  of a single run. Pair with git context for diff-aware gating.
- **`hits` is a count, not a unique-test count.** `hits=0` ≠ "no
  test exists" - a test may exercise the line via a path the
  instrumentation didn't observe.

## References

- [cobertura-home][cob-home] - Cobertura overview and tool
  positioning ("free Java tool that calculates the percentage of
  code accessed by tests").
- [cobertura-dtd][cob-dtd] - `coverage-04.dtd` element /
  attribute declarations: `coverage`, `sources`, `packages`,
  `package`, `classes`, `class`, `methods`, `method`, `lines`,
  `line` with required attributes.
- `jacoco-analysis` - JVM-specific JaCoCo native XML (when Cobertura
  conversion isn't desired).
