---
name: vega-spec-validator
description: "Validate Vega + Vega-Lite specifications against the JSON Schema (vega.github.io/schema), test cross-engine compatibility (Vega-Lite compiles to Vega per the canonical compiler), and verify data-binding correctness. Pair with d3-snapshot-tests when Vega specs render to SVG; pair with chartjs-snapshot-tests when rendered to Canvas. Use when application code generates Vega/Vega-Lite JSON specs at runtime (BI builders, spec templating) and those specs must be proven valid and correctly encoded before render, or before a Vega major-version upgrade."
metadata:
  keywords: "vega, vega-lite, declarative-charts, json-schema, spec-validation"
---

# vega-spec-validator

Vega-Lite specs (**Mark**, **Encoding**, **Data**) compile to Vega,
which renders to SVG/Canvas, per the [Vega-Lite docs]. Tests validate
a spec is well-formed AND produces the expected rendered output.

## When to use

- BI tool / data product builds Vega-Lite specs from user input;
  verify generated specs are valid before render.
- Library upgrade (Vega 5 → Vega 6) - verify existing specs still
  compile + render.
- Custom encoding rules in spec generation - assert the produced
  spec matches the expected mark+encoding shape.

## How to use

1. Install a JSON Schema validator (Ajv) plus the bundled Vega-Lite
   schema; compile the validator **once** and cache it (Step 1).
2. Assert schema validity of every generated spec before anything
   else - compiler errors on an invalid spec are cryptic (Step 1).
3. Add structural assertions that the mark + encoding match the
   intended chart shape, beyond bare schema validity (Step 2).
4. Compile Vega-Lite to Vega to catch semantically-broken specs that
   pass the schema but reference missing fields (Step 3).
5. Confirm the three gates in one end-to-end test (**Worked example**).
6. For render-time, composition, transform, interaction, and
   spec-snapshot coverage, see
   [references/advanced-spec-tests.md](references/advanced-spec-tests.md).

## Step 1 - JSON Schema validation

Per the [Vega-Lite docs], the spec is JSON; it has a published
JSON Schema. Validate:

```js
import Ajv from 'ajv';
import schema from 'vega-lite/build/vega-lite-schema.json';

const ajv = new Ajv({ strict: false });
const validate = ajv.compile(schema);

test('generated bar spec is valid Vega-Lite', () => {
  const spec = generateBarSpec({ x: 'quarter', y: 'revenue' });
  const valid = validate(spec);
  if (!valid) {
    console.log(validate.errors);
  }
  expect(valid).toBe(true);
});
```

Schema URL pattern: `https://vega.github.io/schema/vega-lite/v5.json`
(track current version per the [Vega-Lite docs]).

## Step 2 - Spec structural assertions

Beyond schema validity, assert business-relevant structure:

```js
test('spec uses correct mark + encoding for bar chart', () => {
  const spec = generateBarSpec({ x: 'quarter', y: 'revenue' });

  expect(spec.mark.type).toBe('bar');
  expect(spec.encoding.x.field).toBe('quarter');
  expect(spec.encoding.x.type).toBe('nominal');
  expect(spec.encoding.y.field).toBe('revenue');
  expect(spec.encoding.y.type).toBe('quantitative');
});
```

## Step 3 - Compilation test (Vega-Lite → Vega)

Per the [Vega-Lite docs]: "Vega-Lite compiles a Vega-Lite
specification into a lower-level, more detailed Vega specifications
and rendered using Vega's compiler."

```js
import * as vl from 'vega-lite';

test('Vega-Lite compiles to valid Vega', () => {
  const vlSpec = generateBarSpec(...);
  const vegaSpec = vl.compile(vlSpec).spec;

  // Validate Vega spec against Vega schema
  const vegaValid = validateVegaSchema(vegaSpec);
  expect(vegaValid).toBe(true);
});
```

Failed compilation indicates the Vega-Lite spec is well-formed
schema-wise but semantically broken (e.g., references a non-existent
field).

## Worked example

One test that proves a BI builder's bar-spec generator produces a
spec that is schema-valid, correctly encoded, AND compiles - the
three core gates in a single first run:

```js
import Ajv from 'ajv';
import vlSchema from 'vega-lite/build/vega-lite-schema.json';
import * as vl from 'vega-lite';

const validate = new Ajv({ strict: false }).compile(vlSchema);

test('generated bar spec is valid, correctly encoded, and compiles', () => {
  const spec = generateBarSpec({ x: 'quarter', y: 'revenue' });

  // Gate 1 - schema-valid
  expect(validate(spec)).toBe(true);

  // Gate 2 - correct mark + encoding
  expect(spec.mark.type).toBe('bar');
  expect(spec.encoding.x.field).toBe('quarter');
  expect(spec.encoding.y.type).toBe('quantitative');

  // Gate 3 - compiles to Vega without throwing
  expect(() => vl.compile(spec)).not.toThrow();
});
```

That single test is the minimum a runtime-generated spec must pass
before render. Render-time and semantic verification build on it -
see the advanced reference below.

## Advanced tests

Render-to-SVG assertions, multi-view composition (facet / layer /
concat / repeat), data-transform verification, interaction
parameters, and spec-snapshot regression each get a full worked test
in [references/advanced-spec-tests.md](references/advanced-spec-tests.md).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skip JSON Schema validation; compile direct | Compiler errors are cryptic | Step 1 first |
| Test only the rendered output, not the spec | Spec gen bugs hide behind correct render | Step 2 + spec snapshot (references) |
| Hardcoded Vega-Lite v4 schema | Schema upgrades change validity | Pin AND track |
| Skip transform tests | Aggregate / filter bugs ship silently | Transform test (references) |
| Use `mark: 'bar'` shorthand mixed with object form | Schema accepts both; downstream code may not | Pick one form per project |

## Limitations

- Vega specs are large; full schema validation is slow on big
  spec corpora. Cache compiled validators.
- Vega-Lite is *opinionated* - some custom visuals require
  dropping to plain Vega.
- Per-engine renderers (browser SVG vs canvas vs Vega-Embed +
  worker) differ subtly; pin engine in tests.

## References

- [Vega-Lite docs] - grammar, mark + encoding + data, compilation
  to Vega, multi-view composition, transforms, interactions
- Advanced render / composition / transform / interaction / snapshot
  tests: [references/advanced-spec-tests.md](references/advanced-spec-tests.md)
- `chartjs-snapshot-tests`,
  `d3-snapshot-tests` - sister
  skills for rendered-output testing

[Vega-Lite docs]: https://vega.github.io/vega-lite/docs/
