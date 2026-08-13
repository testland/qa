# CRUSSPIC STMPL - Bach's quality-criteria mnemonic

Deep reference for `exploratory-testing` SKILL.md. CRUSSPIC STMPL is James
Bach's quality-criteria mnemonic. The thirteen criteria are enumerated under
"Quality Criteria Categories" in Bach's *Heuristic Test Strategy Model* (HTSM
v6.3, 2024-11-05), which defines a quality criterion as "some requirement
that defines what the product should be"
([HTSM](https://www.satisfice.com/download/heuristic-test-strategy-model)).
The HTSM prints the criteria as named categories; the CRUSSPIC
STMPL letters are the memory aid taught over them, not an acronym
the HTSM itself spells out.

It overlaps with **ISO/IEC 25010:2023** (the formal software-
quality model) but offers a more practitioner-friendly mnemonic
form that fits in an exploratory tester's working memory.

This reference is used when shaping a session's evaluation lens, and by
the product-risk-register workflow (in qa-process's `risk-matrix`
references/) when categorising risks by quality characteristic.

## When to use

- Authoring a charter - pick which quality criteria the session
  will evaluate.
- Categorising risks in the product register (the
  product-risk-register reference of qa-process's `risk-matrix`).
- Evaluating a vendor / framework (`framework-choice-advisor` in
  qa-process, including its vendor-evaluation reference).
- Reviewing a release candidate - walk CRUSSPIC STMPL to confirm
  each criterion is addressed.

## The thirteen criteria

### CRUSSPIC - primary criteria

#### C - Capability

> Does the system **do** what's claimed?

Functional correctness - the product performs its stated
functions. Maps to ISO/IEC 25010 "Functional suitability."

Test heuristics: HICCUPPS-F's Claims oracle ([hiccupps-f.md](hiccupps-f.md))
+ Coverage from FCC CUTS VIDS ([fcc-cuts-vids.md](fcc-cuts-vids.md)).

#### R - Reliability

> Does the system **work consistently** over time?

- Mean Time Between Failures (MTBF)
- Fault tolerance (degraded mode, retry, failover)
- Recovery time + data preservation
- Idempotency under retry

Maps to ISO 25010 "Reliability."

#### U - Usability

> Can the user **figure out** how to use it?

- Learnability for new users
- Efficiency for repeat users
- Memorability after time away
- Error-recovery from mistakes
- Satisfaction (qualitative)

Per Nielsen's usability heuristics.

#### S - Security

> Is the system **safe** from misuse?

- Confidentiality (PII / secrets not exposed)
- Integrity (data not modified by attackers)
- Availability (DoS resistance)
- Authentication + authorization
- Auditability

Maps to ISO 25010 "Security." Composes with
`qa-security-scanning`,
`qa-test-data-privacy`.

#### S - Scalability

> Does the system **grow** with load?

- Vertical scaling (bigger machines)
- Horizontal scaling (more machines)
- Data-volume scaling (more rows, bigger blobs)
- User-count scaling (more concurrent users)

Composes with `qa-load-testing`.

#### P - Performance

> Is the system **fast enough**?

- Response latency (p50, p95, p99)
- Throughput
- Resource efficiency (CPU, memory, network, disk)
- Startup / cold-start time

Distinct from Scalability - performance is "fast for the user";
scalability is "still fast when load grows." Composes with
`qa-load-testing`.

#### I - Installability

> Can the user **install + configure** the system?

- Installer / setup wizard quality
- Configuration documentation
- Default values appropriate
- Upgrade path from prior versions
- Uninstall completeness

Maps to ISO 25010 "Portability - Installability."

#### C - Compatibility

> Does the system **work alongside** other things?

- OS / browser compatibility matrix
- Backwards-compatibility (old data, old clients)
- Forwards-compatibility (newer data, newer clients)
- Coexistence (same machine, same network, with other software)
- Interoperability (API consumers)

Maps to ISO 25010 "Compatibility."

### STMPL - secondary (operational) criteria

#### S - Supportability

> Can the support team **diagnose + fix** issues?

- Log quality (useful, structured, searchable)
- Observability (traces, metrics)
- Self-service support materials (knowledge base)
- Escalation paths
- Reproducibility from logs alone

#### T - Testability

> Can the testers **verify** the system?

- Test hooks / instrumentation
- Deterministic-mode toggles
- State-inspection endpoints
- Test-data-management hooks
- Mock-able external dependencies

#### M - Maintainability

> Can the team **change** the system?

- Code clarity / structure
- Documentation
- Test coverage
- Dependency management
- Tech debt accumulation

Maps to ISO 25010 "Maintainability."

#### P - Portability

> Can the system **move** between environments?

- Cloud-provider portability (AWS / GCP / Azure)
- OS portability
- Container / VM portability
- Data portability (export + import)
- Configuration portability

Maps to ISO 25010 "Portability."

#### L - Localizability

> Can the system be **adapted to other languages + cultures**?

- Translation support
- Right-to-left layout
- Locale-specific formatting (dates, numbers, currency)
- Cultural appropriateness (icons, colours, idioms)
- ICU MessageFormat / plural rules

Composes with `qa-localization`.

## Mapping to ISO/IEC 25010

ISO 25010 has 8 top-level characteristics:

| ISO 25010 | CRUSSPIC STMPL |
|---|---|
| Functional suitability | C (Capability) |
| Reliability | R (Reliability) |
| Usability | U (Usability) |
| Security | S1 (Security) |
| Performance efficiency | P1 (Performance), S2 (Scalability) |
| Compatibility | C2 (Compatibility) |
| Maintainability | M (Maintainability), T (Testability), S3 (Supportability) |
| Portability | I (Installability), P2 (Portability), L (Localizability) |

CRUSSPIC STMPL is more granular; ISO 25010 is more formal. The
two are complementary, not substitutable. Per ISO/IEC 25010:2023
(cite by stable ID).

## Worked example - applying CRUSSPIC STMPL to a release review

Pre-release review:

```markdown
## Release v3.0 quality-criteria walkthrough

- **C - Capability:** Functional acceptance tests 98% pass. ✓
- **R - Reliability:** Last 30 days uptime 99.94% (SLA: 99.9%). ✓
- **U - Usability:** User research session N=8; 7/8 completed
  signup without help (target: 6/8). ✓
- **S - Security:** Last pen-test 2026-03; all critical findings
  fixed; SAST + DAST clean. ✓
- **S - Scalability:** k6 load test at 10x expected peak passed
  with p99 < 800ms. ✓
- **P - Performance:** p95 latency 220ms (target 300ms). ✓
- **I - Installability:** New install flow 5 steps; user testing
  4/5 completed. ✓
- **C - Compatibility:** Browser matrix Chrome / Firefox / Safari
  all current + N-1 tested. ✓
- **S - Supportability:** All log lines structured; trace IDs
  end-to-end. ✓
- **T - Testability:** E2E suite runs in 18 min; deterministic
  mode available. ✓
- **M - Maintainability:** Sonar tech-debt rating A. ✓
- **P - Portability:** Cloud-portable (Terraform); no AWS-specific
  primitives. ✓
- **L - Localizability:** All UI strings extracted to ICU
  messages; 7 locales supported. ✓

Verdict: cleared for release.
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Treating CRUSSPIC STMPL as flat | Some criteria matter much more for some products (Security for fintech, Localizability for global B2C) | Weight per product context |
| Confusing Performance with Scalability | "Fast" doesn't mean "stays fast under load" | Test both independently |
| Treating Maintainability + Testability as "developer concerns" | They're quality criteria the tester evaluates | Include in release walkthrough |
| Skipping Supportability | Released system unmaintainable in production | Always walk S |
| One person evaluates all 13 | Inter-criterion expertise differs | Distribute walkthrough across team |
| Walkthrough at release time only | Quality criteria degrade silently between releases | Continuous monitoring per criterion |

## Limitations

- **Subjective weighting.** Criteria importance differs per
  product / domain / regulatory context.
- **Some criteria are evaluatable only in production.** Reliability
  + Supportability need real usage data.
- **Mnemonic overload.** Thirteen letters is at the edge of working
  memory; testers often print the catalog.
- **Doesn't replace ISO 25010 formal model.** For regulated /
  compliance contexts use ISO 25010 + cite formally; use
  CRUSSPIC STMPL as the working-memory mnemonic.

## References

- Bach J. *Heuristic Test Strategy Model* v6.3 (PDF), "Quality
  Criteria Categories" - the source enumerating the thirteen
  criteria this mnemonic indexes - 
  [satisfice.com/download/heuristic-test-strategy-model](https://www.satisfice.com/download/heuristic-test-strategy-model).
- Bach J. *Heuristics of Software Testability* - 
  [satisfice.com/heuristics-of-software-testability](https://www.satisfice.com/heuristics-of-software-testability).
- ISO/IEC 25010:2023 "Systems and software Quality Requirements
  and Evaluation (SQuaRE) - Product quality model" - cite by
  stable ID; iso.org paywall.
- Nielsen J. Usability heuristics - nngroup.com/articles/ten-usability-heuristics.
- Sibling references: [hiccupps-f.md](hiccupps-f.md), [sfdpot.md](sfdpot.md),
  [fcc-cuts-vids.md](fcc-cuts-vids.md), [tours.md](tours.md).
- Consumed by: the product-risk-register workflow in qa-process's `risk-matrix` references/.
