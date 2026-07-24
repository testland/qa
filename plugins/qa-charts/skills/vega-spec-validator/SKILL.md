---
name: vega-spec-validator
description: "Validate Vega + Vega-Lite specifications against the JSON Schema (vega.github.io/schema), test cross-engine compatibility (Vega-Lite compiles to Vega per the canonical compiler), and verify data-binding correctness. Pair with d3-snapshot-tests when Vega specs render to SVG; pair with chartjs-snapshot-tests when rendered to Canvas. Use when application code generates Vega/Vega-Lite JSON specs at runtime (BI builders, spec templating) and those specs must be proven valid and correctly encoded before render, or before a Vega major-version upgrade."
metadata:
  keywords: "vega, vega-lite, declarative-charts, json-schema, spec-validation"
---

# vega-spec-validator

Per the [Vega-Lite docs], Vega-Lite is "a declarative JSON-based
grammar" with three primary specification elements: **Mark**,
**Encoding**, **Data**. Vega-Lite compiles to Vega; Vega renders to
SVG/Canvas. Tests validate the spec is well-formed AND produces the
expected rendered output.

## When to use

- BI tool / data product builds Vega-Lite specs from user input;
  verify generated specs are valid before render.
- Library upgrade (Vega 5 → Vega 6) - verify existing specs still
  compile + render.
- Custom encoding rules in spec generation - assert the produced
  spec matches the expected mark+encoding shape.

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

## Step 4 - Render-to-SVG test

```js
import { Vega } from 'react-vega';
import { create } from 'jsdom';

test('renders SVG with expected mark count', async () => {
  const dom = create('<div id="vis"></div>');
  global.document = dom.window.document;

  const view = new vega.View(vega.parse(vegaSpec))
    .renderer('svg')
    .initialize(dom.window.document.querySelector('#vis'))
    .run();

  const svg = await view.toSVG();
  // Use a parser to count <path>/<rect> elements
  const rectCount = (svg.match(/<rect/g) || []).length;
  expect(rectCount).toBe(4);  // 4 quarters
});
```

## Step 5 - Multi-view composition test

Per the [Vega-Lite docs], Vega-Lite supports faceting, layering,
concatenation, repeating. Test each composition:

```js
test('layered spec has 2 layers', () => {
  const spec = {
    layer: [
      { mark: 'line', encoding: {...} },
      { mark: 'point', encoding: {...} },
    ],
  };

  expect(validate(spec)).toBe(true);
  expect(spec.layer).toHaveLength(2);
});

test('faceted spec creates one view per category', async () => {
  const spec = {
    facet: { field: 'category', type: 'nominal' },
    spec: { mark: 'bar', encoding: {...} },
  };

  const compiled = vl.compile(spec).spec;
  const view = new vega.View(vega.parse(compiled)).renderer('svg').initialize(...).run();
  // Inspect view's data tables to verify N facets emerged
});
```

## Step 6 - Data transform test

Per the [Vega-Lite docs], transforms include "Aggregate, filter,
bin, calculate, fold, pivot." Test transform output:

```js
test('aggregate transform produces correct sum', () => {
  const spec = {
    data: { values: [
      { region: 'NA', revenue: 100 },
      { region: 'NA', revenue: 200 },
      { region: 'EU', revenue: 150 },
    ]},
    transform: [
      { aggregate: [{ op: 'sum', field: 'revenue', as: 'total' }],
        groupby: ['region'] },
    ],
    mark: 'bar',
    encoding: { x: { field: 'region' }, y: { field: 'total', type: 'quantitative' } },
  };

  const view = new vega.View(vega.parse(vl.compile(spec).spec));
  await view.runAsync();
  const data = view.data('source_0');
  expect(data.find(d => d.region === 'NA').total).toBe(300);
  expect(data.find(d => d.region === 'EU').total).toBe(150);
});
```

## Step 7 - Interaction (parameters / selections)

Per the [Vega-Lite docs], "Interactive parameters - Selections and
value bindings" enable interaction. Test parameters resolve:

```js
test('selection parameter filters data', async () => {
  const spec = {
    params: [{ name: 'brush', select: 'interval' }],
    data: {...},
    mark: 'point',
    encoding: {...},
    transform: [{ filter: { param: 'brush' } }],
  };

  // Compile, render, inject brush event, verify filtered data
  ...
});
```

## Step 8 - Spec-snapshot regression

For complex spec-generation logic, snapshot the spec output:

```js
test('quarterly-revenue spec snapshot stable', () => {
  const spec = generateBarSpec({
    x: 'quarter',
    y: 'revenue',
    title: 'Quarterly Revenue',
  });

  expect(spec).toMatchSnapshot('quarterly-revenue.spec.json');
});
```

When intentionally changing spec generation, regenerate snapshots:
`UPDATE_SNAPSHOTS=1 npm test`.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skip JSON Schema validation; compile direct | Compiler errors are cryptic | Step 1 first |
| Test only the rendered output, not the spec | Spec gen bugs hide behind correct render | Step 2 + Step 8 |
| Hardcoded Vega-Lite v4 schema | Schema upgrades change validity | Pin AND track |
| Skip transform tests | Aggregate / filter bugs ship silently | Step 6 |
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
- `chartjs-snapshot-tests`,
  `d3-snapshot-tests` - sister
  skills for rendered-output testing

[Vega-Lite docs]: https://vega.github.io/vega-lite/docs/
