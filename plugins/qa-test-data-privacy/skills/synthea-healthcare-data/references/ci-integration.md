# Synthea CI integration

Referenced from [SKILL.md](../SKILL.md). For health IT projects, regenerate
Synthea data on every PR with a pinned seed so the dataset is reproducible:

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
