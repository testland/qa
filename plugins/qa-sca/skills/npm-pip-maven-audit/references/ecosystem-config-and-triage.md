# Per-ecosystem audit config, triage, and aggregation

Deep reference for the `npm-pip-maven-audit` SKILL.md. SKILL.md keeps the
primary scan command per ecosystem and the CI hashFiles gate; this file holds
the speed/coverage tradeoffs, the Maven plugin block, the full suppression
templates, and output aggregation.

## Native audit vs unified scanner tradeoffs

| Property | Native audit | Snyk / OSV |
|---|---|---|
| Speed | <5s typical | 10s - 60s |
| DB coverage | Per-ecosystem only | Cross-ecosystem aggregated |
| False-positive triage | Per-ecosystem CLI | Unified config |
| Reachability analysis | None | None (most tools) |
| CI integration | Built into package manager | Per-tool action |

Native audit catches the high-confidence per-ecosystem feed quickly; the
unified scanner catches cross-ecosystem aggregations and waivers.

## Maven OWASP Dependency-Check plugin

Maven's audit story is the OWASP Dependency-Check plugin (no native `mvn
audit`):

```xml
<!-- pom.xml -->
<plugin>
  <groupId>org.owasp</groupId>
  <artifactId>dependency-check-maven</artifactId>
  <version>10.0.4</version>
  <executions>
    <execution>
      <goals>
        <goal>check</goal>
      </goals>
    </execution>
  </executions>
  <configuration>
    <failBuildOnCVSS>7.0</failBuildOnCVSS>
    <suppressionFile>dependency-check-suppressions.xml</suppressionFile>
    <formats>
      <format>HTML</format>
      <format>JSON</format>
      <format>SARIF</format>
    </formats>
  </configuration>
</plugin>
```

For Gradle: the same plugin via the `org.owasp.dependencycheck` Gradle plugin.
Source: jeremylong.github.io/DependencyCheck/dependency-check-maven/.

## Suppression justification templates

Justification is mandatory in the suppression file or audit-skip list:

```xml
<!-- dependency-check-suppressions.xml (Maven) -->
<suppress>
  <notes>
    Reason: log4j-core 2.14.x is bundled but not loaded at runtime
            (verified via dependency tree analysis)
    Approved-by: alice@example.com
    Re-review-date: 2026-09-15
  </notes>
  <packageUrl regex="true">^pkg:maven/org\.apache\.logging\.log4j/log4j-core@2\.14\..*$</packageUrl>
  <vulnerabilityName>CVE-2021-44228</vulnerabilityName>
</suppress>
```

For ad-hoc CLI ignores (`pip-audit --ignore-vuln`, `cargo audit --ignore`),
maintain a sibling `AUDIT_IGNORES.md` mapping each ID to reason + approver +
re-review-date. Without the sibling file, the ignore is invisible to reviewers.

Cadence: every quarter, audit suppression entries; expired re-review dates
remove entries.

## Output aggregation

For downstream aggregation, output each tool's JSON to a stable filename:

```bash
npm audit --json > sca-npm.json || true        # || true: don't fail before triage
pip-audit --format json --output sca-pip.json || true
mvn dependency-check:check -Dformats=JSON
cargo audit --json > sca-cargo.json || true
```

The aggregation step normalizes each tool's schema + dedupes cross-tool
findings.
