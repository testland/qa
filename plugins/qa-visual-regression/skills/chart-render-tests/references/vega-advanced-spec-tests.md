# Vega/Vega-Lite advanced spec tests

Deep reference for the Vega side of `chart-render-tests` ([vega.md](vega.md)). Consult after the
core schema + structure + compilation gates pass, when adding
render-time, composition, transform, interaction, or spec-snapshot
coverage.

[Vega-Lite docs]: https://vega.github.io/vega-lite/docs/

## Render-to-SVG test

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

## Multi-view composition test

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

## Data transform test

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

## Interaction (parameters / selections)

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

## Spec-snapshot regression

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
