---
name: synthea-healthcare-data
description: "Author and run Synthea (MITRE's open-source synthetic patient population simulator) to produce HIPAA-safe synthetic medical records for testing health IT systems. Covers Gradle build, population-size and state-specific generation, FHIR R4 / STU3 / DSTU2 / C-CDA / CSV / CPCDS output formats, disease-module customisation, and the lifecycle-simulation approach (birth-through-death patient journeys with realistic demographics). Use when testing FHIR servers, EHR integrations, claims processing, or any health IT system that needs realistic patient records without HIPAA exposure (distinct from faker-synthetic-data which is generic; this is health-domain-specific)."
rating: 23
d6: 4
archetype: S1
---

# synthea-healthcare-data

## Overview

Synthea is MITRE's open-source synthetic-patient population
simulator that generates realistic but fictional medical records
across the full patient lifecycle (birth through death). The
output is structurally valid FHIR / C-CDA / CSV that downstream
health IT systems consume without exposing any real patient data.

Source: [github.com/synthetichealth/synthea](https://github.com/synthetichealth/synthea).

Use this when:

- Building a FHIR-server test environment that needs realistic
  patient demographics + conditions + encounters + observations +
  medications.
- Stress-testing an EHR import / export pipeline.
- Demoing a health-tech product without HIPAA exposure on a real
  dataset.

For non-health-domain synthetic data use
[`faker-synthetic-data`](../faker-synthetic-data/SKILL.md). For
the **categories** of PHI that Synthea avoids exposing see
[`pii-categories-reference`](../pii-categories-reference/SKILL.md)
(HIPAA Safe Harbor 18 identifiers).

## When to use

- Testing FHIR server compliance (R4 / STU3 / DSTU2 conformance).
- Populating an EHR-like development environment.
- Generating claims / EDI data for revenue-cycle testing
  (Synthea's CPCDS output).
- Property-based testing of risk-adjustment / HCC-coding logic.

## Authoring

### Install + build

Per [github.com/synthetichealth/synthea](https://github.com/synthetichealth/synthea):

```bash
git clone https://github.com/synthetichealth/synthea.git
cd synthea
./gradlew build check test
```

Requires Java JDK 17 or newer (LTS versions recommended per the
README).

### Generate a population

Basic invocation:

```bash
./run_synthea
```

With explicit population size and state:

```bash
./run_synthea -p 1000 Massachusetts
```

Per the README: `-p` sets population size; the trailing argument
sets the US state (locale-aware demographics and provider
networks).

### Common run flags

| Flag | Purpose |
|---|---|
| `-p <n>` | Population size |
| `-s <seed>` | Random seed (deterministic output) |
| `-cs <seed>` | Clinician seed |
| `-r <date>` | Reference date (YYYYMMDD) |
| `-e <date>` | End date |
| `-g <M\|F>` | Filter by gender |
| `-a <minAge>-<maxAge>` | Age range |
| `-c <config.properties>` | Override configuration file |

### Output formats

Per the README the system emits:

- **HL7 FHIR R4** (default), STU3, DSTU2
- **Bulk FHIR** (ndjson, suitable for $export endpoints)
- **C-CDA** (Consolidated Clinical Document Architecture)
- **CSV** (flat-file format)
- **CPCDS** (Common Payer Consumer Data Set, for claims testing)

Output destination: `./output/fhir/`, `./output/csv/`, etc.

Configure formats in `src/main/resources/synthea.properties`:

```properties
exporter.fhir.export = true
exporter.fhir_stu3.export = false
exporter.ccda.export = false
exporter.csv.export = true
```

## Running

### Pre-generated population

For quick starts MITRE distributes pre-generated SyntheaMass
populations (1M patient Massachusetts simulation, etc.) on the
project site - search for "Synthea downloadable populations" if
you don't need to regenerate.

### Disease modules

Synthea uses a Modular Rule System (per README) where each disease
/ condition is a JSON-defined state machine in
`src/main/resources/modules/`. Examples include diabetes,
hypertension, COPD, opioid addiction, COVID-19, sepsis, and dozens
more. The module drives the patient's clinical journey
probabilistically.

To add a custom module, drop a JSON spec into the modules
directory; the engine picks it up on next run.

### Loading into a FHIR server

```bash
# After ./run_synthea generates output/fhir/*.json
for f in output/fhir/*.json; do
  curl -X POST -H "Content-Type: application/fhir+json" \
       -d @"$f" http://localhost:8080/fhir/
done
```

For bulk-FHIR ingestion, use the `output/fhir/*.ndjson` files with
your server's bulk-data endpoint.

## Parsing results

CSV outputs have predictable schemas:

```
output/csv/
  patients.csv       — patient_id, birthdate, deathdate, ssn, drivers, ...
  encounters.csv     — encounter_id, patient, organization, ...
  conditions.csv     — start, stop, patient, encounter, code, description
  medications.csv    — start, stop, patient, code, description, ...
  observations.csv   — date, patient, encounter, code, value, units
  procedures.csv
  immunizations.csv
  allergies.csv
  imaging_studies.csv
  careplans.csv
  claims.csv
```

The `patients.csv` `ssn` column contains **fake** SSNs in
Synthea's reserved test range - they look real-formatted but
don't correspond to issued SSAs. This is the intended
HIPAA-safe replacement.

For FHIR output, parse with any standard FHIR client (HAPI FHIR
Java, fhir.resources for Python, etc.).

## CI integration

For health IT projects, regenerate Synthea data on every PR with a
pinned seed so the dataset is reproducible:

```yaml
jobs:
  fhir-integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-java@v5
        with: { java-version: '17', distribution: 'temurin' }
      - run: git clone https://github.com/synthetichealth/synthea.git
      - run: cd synthea && ./gradlew build -x test
      - run: cd synthea && ./run_synthea -p 50 -s 2026 Massachusetts
      - run: |
          # Load Synthea output into local FHIR server
          docker-compose up -d hapi-fhir
          for f in synthea/output/fhir/*.json; do
            curl -sS -X POST -H "Content-Type: application/fhir+json" \
                 --data-binary @"$f" http://localhost:8080/fhir/
          done
      - run: pytest tests/integration/
```

For repeatable tests, pin Synthea to a tag (`git checkout v3.x.x`)
since modules evolve.

## Example - generate 100 diabetic patients in MA

```bash
./run_synthea -p 100 -s 42 -a 40-75 Massachusetts \
  -m diabetes
```

`-m <module>` filters to runs that include the named module.
Output appears in `./output/` (fhir/, csv/, c-cda/ per
synthea.properties).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Using a real-patient seed file then claiming "synthetic" | Real PHI inadvertently embedded; HIPAA exposure | Always start from Synthea defaults or audited synthetic seed |
| Running without a pinned seed in CI | Output drifts across runs; test fixtures unstable | `-s <seed>` per CI run; pin Synthea version |
| Faking demographics with `faker-synthetic-data` for a health context | Faker generates uncorrelated values; ICD codes, medications, encounters don't link | Use Synthea for any health-domain dataset |
| Loading Synthea output into a "real" FHIR server without isolation | If a misconfigured environment crosses into production, fake patients land in real EHR | Strict env separation; namespace Synthea patient IDs (prefix with `synth-`) |
| Treating Synthea SSNs as truly safe in all jurisdictions | Synthea uses reserved SSN ranges but format is still HIPAA-flagged | Pair with [`presidio-pii-detection`](../presidio-pii-detection/SKILL.md) on logs to confirm no SSN leakage |
| Custom module without validation | Malformed module silently runs (or doesn't); fixtures look right but cover nothing | Validate JSON modules against Synthea's schema before running large populations |
| Single-state generation for a national rollout test | Demographic skew (e.g., MA is not Texas) | Generate per state and merge |

## Limitations

- **Slow at large scale.** A 1M-patient run on a laptop takes
  hours. For interactive testing keep `-p` ≤ 10 000.
- **US-centric.** Modules and demographics are calibrated for US
  populations; international healthcare contexts need module
  adaptation.
- **Module library is opinionated.** Default modules reflect MITRE
  / public-health authoring choices; custom modules may be needed
  for niche specialties.
- **No claims-data realism guarantee.** CPCDS output is structurally
  valid; claims edge cases (denials, adjustments, coordination of
  benefits) are simulated but may not match every payer's
  business rules.
- **No PHI guarantee against re-identification of generators.**
  The synthetic population is fictional, but the *modules* (which
  conditions get simulated, prevalence rates) are derived from
  public health data. The output won't re-identify any individual.

## References

- Synthea GitHub - 
  [github.com/synthetichealth/synthea](https://github.com/synthetichealth/synthea).
- MITRE Synthea project site - synthea.mitre.org (the canonical
  project home; documentation, downloads, community).
- HIPAA Safe Harbor (45 CFR § 164.514(b)(2)) - the de-identification
  standard Synthea output is engineered against. See
  [`pii-categories-reference`](../pii-categories-reference/SKILL.md).
- Sibling generator (generic):
  [`faker-synthetic-data`](../faker-synthetic-data/SKILL.md).
- Composes with:
  [`pii-masking-pipeline-builder`](../pii-masking-pipeline-builder/SKILL.md).
