---
name: synthea-healthcare-data
description: "Author and run Synthea (MITRE's open-source synthetic patient population simulator) to produce HIPAA-safe synthetic medical records for testing health IT systems. Covers Gradle build, population-size and state-specific generation, FHIR R4 / STU3 / DSTU2 / C-CDA / CSV / CPCDS output formats, disease-module customisation, and the lifecycle-simulation approach (birth-through-death patient journeys with realistic demographics). Use when testing FHIR servers, EHR integrations, claims processing, or any health IT system that needs realistic patient records without HIPAA exposure (distinct from the generic Faker family - qa-test-data faker-data for fixtures, the pii-masking-pipeline-builder faker-masking-operators reference for masking substitution; this is health-domain-specific)."
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

For non-health-domain fixture data use the `qa-test-data` plugin's
`faker-data`; for Faker-driven masking substitution see the
faker-masking-operators catalog in `pii-masking-pipeline-builder`
references/. For the **categories** of PHI that Synthea avoids exposing
see the pii-categories catalog there
(HIPAA Safe Harbor 18 identifiers).

## When to use

- Testing FHIR server compliance (R4 / STU3 / DSTU2 conformance).
- Populating an EHR-like development environment.
- Generating claims / EDI data for revenue-cycle testing
  (Synthea's CPCDS output).
- Property-based testing of risk-adjustment / HCC-coding logic.

## How to use

1. Clone Synthea and build it with Gradle (JDK 17+); confirm `./gradlew build
   check test` passes.
2. Set the output formats you need in `src/main/resources/synthea.properties`
   (FHIR R4, CSV, C-CDA, CPCDS).
3. Run `./run_synthea` with a pinned seed (`-s`), a population size (`-p`), and
   the target US state so the run is reproducible.
4. Inspect the output under `./output/fhir/` or `./output/csv/` and confirm the
   expected resources / schemas are present.
5. Load the records into your test FHIR server (per-file POST, or the
   `*.ndjson` bulk files for a bulk-data endpoint).
6. Wire generation into CI with a pinned seed and pinned Synthea tag
   ([references/ci-integration.md](references/ci-integration.md)).
7. Run your integration tests against the loaded synthetic population.

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
  patients.csv      - patient_id, birthdate, deathdate, ssn, drivers, ...
  encounters.csv    - encounter_id, patient, organization, ...
  conditions.csv    - start, stop, patient, encounter, code, description
  medications.csv   - start, stop, patient, code, description, ...
  observations.csv  - date, patient, encounter, code, value, units
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

For health IT projects, regenerate Synthea data on every PR with a pinned seed
so the dataset is reproducible. The full GitHub Actions job (build, generate,
load into a local HAPI FHIR server, run integration tests) plus the
pin-to-a-tag note is in
[references/ci-integration.md](references/ci-integration.md).

## Worked example

Generate 100 diabetic patients aged 40-75 in Massachusetts, then verify the
output before loading it into a test FHIR server:

```bash
./run_synthea -p 100 -s 42 -a 40-75 Massachusetts \
  -m diabetes
```

`-m <module>` filters to runs that include the named module; `-s 42` pins the
seed so the same 100 patients regenerate every time. Output appears in
`./output/` (fhir/, csv/, c-cda/ per synthea.properties).

Confirm the run: `output/csv/conditions.csv` should carry diabetes condition
rows linked by `patient` to `output/csv/patients.csv`, and every patient's
`birthdate` should place them in the 40-75 age band. Once verified, POST the
`output/fhir/*.json` bundles into the test FHIR server as shown under
"Loading into a FHIR server".

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Using a real-patient seed file then claiming "synthetic" | Real PHI inadvertently embedded; HIPAA exposure | Always start from Synthea defaults or audited synthetic seed |
| Running without a pinned seed in CI | Output drifts across runs; test fixtures unstable | `-s <seed>` per CI run; pin Synthea version |
| Faking demographics with generic Faker substitution for a health context | Faker generates uncorrelated values; ICD codes, medications, encounters don't link | Use Synthea for any health-domain dataset |
| Loading Synthea output into a "real" FHIR server without isolation | If a misconfigured environment crosses into production, fake patients land in real EHR | Strict env separation; namespace Synthea patient IDs (prefix with `synth-`) |
| Treating Synthea SSNs as truly safe in all jurisdictions | Synthea uses reserved SSN ranges but format is still HIPAA-flagged | Pair with `presidio-pii-detection` on logs to confirm no SSN leakage |
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
  standard Synthea output is engineered against. See the
  pii-categories catalog in `pii-masking-pipeline-builder` references/.
- Sibling generator (generic fixtures):
  `faker-data` in the qa-test-data plugin.
- Composes with:
  `pii-masking-pipeline-builder`.
- Reference file:
  [references/ci-integration.md](references/ci-integration.md) (CI job + tag pinning).
