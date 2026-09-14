# What is covered where - studio-web

Maintained by @priya-s. Last walked through 2026-09-08, file by file.

## End-to-end tests that duplicate a lower layer

These twelve assert something that already has an equivalent assertion at the
unit layer. They are safe to retire; the behaviour keeps its cover.

| e2e test                                | Duplicates                          |
|-----------------------------------------|-------------------------------------|
| `snap distance rounds to the grid`      | `test/unit/geometry.test.js`        |
| `rotation preserves bounding box area`  | `test/unit/geometry.test.js`        |
| `hex colour parses with and without #`  | `test/unit/colour.test.js`          |
| `wall length label uses metric`         | `test/unit/units.test.js`           |
| `wall length label uses imperial`       | `test/unit/units.test.js`           |
| `area sums to the sum of its rooms`     | `test/unit/area.test.js`            |
| `furniture id is a stable uuid v4`      | `test/unit/ids.test.js`             |
| `export filename is slugified`          | `test/unit/export-name.test.js`     |
| `zoom clamps at 25% and 400%`           | `test/unit/viewport.test.js`        |
| `pan offset is clamped to the canvas`   | `test/unit/viewport.test.js`        |
| `layer order is stable under insert`    | `test/unit/layers.test.js`          |
| `undo stack caps at fifty entries`      | `test/unit/history.test.js`         |

## End-to-end tests with no equivalent anywhere else

These nine are real pointer-event behaviour against a real canvas element.
There is no lower layer for them: the drag, the hit-testing and the repaint are
the thing being asserted, and we have twice tried and failed to fake them in
jsdom.

- `drag a wall and the adjoining rooms re-flow`
- `multi-select with shift and move as a group`
- `snap-to-grid engages within 8 device pixels`
- `resize handle keeps aspect ratio with shift held`
- `undo after a transform restores the exact geometry`
- `two-finger pan on a trackpad does not select`
- `copy-paste places at the pointer, not the origin`
- `export to PDF matches the on-screen bounds`
- `autosave fires after a drag and survives reload`

Customers have reported eight canvas regressions in the last year. Six were
caught by tests in this second list before release. The other two were not
caught at all.

## Where the middle layer is thin

The API boundary between the editor and the document service has 64 integration
tests covering save, load and conflict resolution. Nothing covers the export
pipeline, the share-link permission model, the template import path, or the
font-substitution fallback. All four of those have shipped bugs this year that
unit tests could not have caught and that we found in staging.
