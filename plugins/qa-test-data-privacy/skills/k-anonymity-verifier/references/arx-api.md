# ARX for anonymization + verification (Java / GUI)

Referenced from [SKILL.md](../SKILL.md) Step 7. Use ARX when the masking step
itself must be performed, or when a GUI workflow is required
([arx.deidentifier.org/development/api](https://arx.deidentifier.org/development/api/)).

## Java API

```java
// Load data
Data data = Data.create("masked.csv", Charset.defaultCharset(), ';');

// Classify attributes
data.getDefinition().setAttributeType(
    "diagnosis", AttributeType.SENSITIVE_ATTRIBUTE);
data.getDefinition().setAttributeType(
    "age", AttributeType.QUASI_IDENTIFYING_ATTRIBUTE);

// Configure privacy models
ARXConfiguration config = ARXConfiguration.create();
config.addPrivacyModel(new KAnonymity(10));
config.addPrivacyModel(new EntropyLDiversity("diagnosis", 3));
config.addPrivacyModel(new EqualDistanceTCloseness("diagnosis", 0.2d));
config.setSuppressionLimit(0.02d);   // suppress at most 2 % of rows

// Anonymize and read result
ARXAnonymizer anonymizer = new ARXAnonymizer();
ARXResult result = anonymizer.anonymize(data, config);
ARXNode optimal = result.getOptimalTransformation();
```

Per [arx.deidentifier.org/development/api](https://arx.deidentifier.org/development/api/),
`KAnonymity(n)`, `EntropyLDiversity(attr, n)`,
`EqualDistanceTCloseness(attr, t)`, and
`HierarchicalDistanceTCloseness(attr, t, hierarchy)` are the key
privacy-model classes. `setSuppressionLimit(0.02d)` caps the fraction
of records ARX may suppress to achieve the target models.

## GUI workflow

Per [arx.deidentifier.org/anonymization-tool](https://arx.deidentifier.org/anonymization-tool/):

1. Load CSV via Configuration perspective.
2. Classify each column as Identifying, Quasi-Identifying, Sensitive,
   or Insensitive.
3. Define a generalisation hierarchy per QI column (age ranges, ZIP
   truncation).
4. Add privacy models (k-anonymity + l-diversity + t-closeness).
5. Run analysis - ARX explores the solution space and marks
   satisfying transformations.
6. Switch to Risk Analysis perspective to read re-identification risk
   scores (prosecutor, journalist, marketer attack models).
7. Switch to Utility Analysis perspective to compare pre/post utility
   metrics side by side.
