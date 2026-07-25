# Safety-standard coverage expectations and report formats

Deep reference for the `embedded-coverage-strategy-reference` SKILL.md.
Consult when negotiating a coverage target against a safety standard, or when
choosing which report format to produce and gate on.

## Safety-standard coverage expectations

These are cited by stable ID - the standards themselves are gated and not
WebFetchable.

| Standard / level | Minimum structural coverage |
|---|---|
| **MISRA-C:2012 Coverage Guidance** | No prescribed numeric target; the rule set requires *defined* control flow and explicit `default:` in `switch`, which makes branch coverage achievable. See "MISRA-C:2012 §8 Coverage" |
| **DO-178C / DAL A** (catastrophic failure) | MC/DC required for every condition (see "DO-178C §6.4.4 Structural Coverage") |
| **DO-178C / DAL B** | Decision coverage |
| **DO-178C / DAL C** | Statement coverage |
| **DO-178C / DAL D** | None mandated |
| **ISO 26262 ASIL D** | MC/DC strongly recommended for unit verification (see "ISO 26262-6:2018 Table 12") |
| **ISO 26262 ASIL A / B / C** | Branch (B/C) or statement (A) coverage |
| **IEC 62304 Class C** (medical, life-supporting) | No numeric target, but bidirectional traceability + structural coverage justification expected |

The number "100% MC/DC" in aviation is famously expensive; the standard
accepts "MC/DC of the integrated executable object code" which is interpreted
differently by certifiers. Treat these as the *floor*, not a turnkey recipe.

## Coverage report formats

| Format | Producer | Consumer |
|---|---|---|
| `.gcov` (text) | `gcov` | Human reading; line-level annotation |
| `.gcov.json.gz` | `gcov --json-format` | CI parser; no source-code dependency per GCC docs |
| `.info` (LCOV) | `lcov --capture` or `llvm-cov export -format=lcov` | Codecov / Coveralls / SonarQube |
| `.profdata` | `llvm-profdata merge` | Input only to `llvm-cov` |
| HTML | `genhtml` (LCOV) or `llvm-cov show -format=html` | Humans; not for diff'ing |
| JSON | `llvm-cov export -format=text` | Custom CI dashboards |
| Cobertura XML | `gcovr --xml` (gcovr is a third-party gcov wrapper) | Jenkins coverage plugin |

For embedded CI, the rule of thumb is: produce `lcov.info` as the durable
artefact; render HTML for the developer; gate the PR on the `.info` totals.
