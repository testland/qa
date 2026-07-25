# JaCoCo Gradle config, XML parsing, counter-aware gating, and CI

Deep reference for the jacoco-analysis SKILL.md. Consult for the Gradle plugin
equivalent, the `jacoco.xml` parser, the per-counter gating table, the
JaCoCo-to-Cobertura / LCOV conversions, and the Maven `verify` CI job.

[counters]: https://www.jacoco.org/jacoco/trunk/doc/counters.html

## Gradle equivalent

```gradle
plugins {
  id 'java'
  id 'jacoco'
}

jacoco {
  toolVersion = '0.8.13'
}

test {
  finalizedBy jacocoTestReport
}

jacocoTestReport {
  dependsOn test
  reports {
    xml.required = true
    html.required = true
    csv.required = false
  }
}

jacocoTestCoverageVerification {
  violationRules {
    rule {
      limit {
        counter = 'INSTRUCTION'
        value = 'COVEREDRATIO'
        minimum = 0.80
      }
      limit {
        counter = 'BRANCH'
        value = 'COVEREDRATIO'
        minimum = 0.70
      }
    }
  }
}

check.dependsOn jacocoTestCoverageVerification
```

## Parse `jacoco.xml`

The JaCoCo XML format mirrors the report tree (report -> package ->
class -> method -> counter):

```xml
<report name="my-app">
  <package name="com/example/checkout">
    <class name="com/example/checkout/Cart" sourcefilename="Cart.java">
      <method name="addItem" desc="(LItem;)V" line="12">
        <counter type="INSTRUCTION" missed="0" covered="15"/>
        <counter type="BRANCH" missed="1" covered="3"/>
        <counter type="LINE" missed="0" covered="3"/>
        <counter type="METHOD" missed="0" covered="1"/>
        <counter type="COMPLEXITY" missed="0" covered="2"/>
      </method>
      <counter type="INSTRUCTION" missed="0" covered="42"/>
      ...
    </class>
    <counter type="INSTRUCTION" missed="0" covered="100"/>
    ...
  </package>
  <counter type="INSTRUCTION" missed="20" covered="500"/>
  ...
</report>
```

```python
# scripts/parse_jacoco.py
import xml.etree.ElementTree as ET

def parse_jacoco(path):
    root = ET.parse(path).getroot()
    files = []
    for pkg in root.findall('package'):
        for cls in pkg.findall('class'):
            counters = {c.get('type'): {
                            'missed': int(c.get('missed')),
                            'covered': int(c.get('covered')),
                        } for c in cls.findall('counter')}
            files.append({
                'package': pkg.get('name'),
                'name': cls.get('name'),
                'sourcefile': cls.get('sourcefilename'),
                'counters': counters,
            })
    return files
```

## Counter-aware metrics

Per [jacoco-counters][counters], the six counters have different
semantics. Don't aggregate naively:

| Counter      | When to gate on it                                                                  |
|--------------|--------------------------------------------------------------------------------------|
| INSTRUCTION  | The most granular; least sensitive to source formatting. Best whole-repo gate.      |
| LINE         | Most intuitive for reviewers; aggregates per source line.                            |
| BRANCH       | Critical for control flow correctness; gate separately from line.                    |
| METHOD       | Coarse-grained; "any test touched this method" - useful as a "no dead code" floor. |
| CLASS        | Even coarser; "any test touched this class" - proves the test suite at least loads it. |
| COMPLEXITY   | Pair with branch coverage; high-complexity uncovered methods are the highest-risk. |

## Cross-language: convert JaCoCo XML

For projects that mix JVM with other languages and want one
coverage UI, convert JaCoCo XML to a sibling format.

### To Cobertura

```bash
# Use the cover2cover.py script (community-maintained):
python cover2cover.py target/site/jacoco/jacoco.xml src/main/java > target/cobertura.xml
```

Then feed `cobertura-analysis`.

### To LCOV

```bash
# Use the xml2lcov converter (per LCOV's language-agnostic converter family):
xml2lcov target/site/jacoco/jacoco.xml > target/jacoco.info
```

Then feed `lcov-analysis`. LCOV is the language-agnostic interchange
format; LCOV's own documentation lists JaCoCo conversion as a
supported path.

## CI shape

```yaml
- name: Run Maven verify
  run: ./mvnw -B verify

- name: Upload JaCoCo report
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: jacoco
    path: target/site/jacoco/

- name: Convert to LCOV for SaaS
  run: xml2lcov target/site/jacoco/jacoco.xml > target/jacoco.info

- name: Upload to coverage SaaS
  uses: codecov/codecov-action@v5
  with:
    files: target/jacoco.info
```
