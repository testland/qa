# studio-web - customer-reported regressions in the editor, 2026 to date

| # | Date  | What customers saw | Unit suite | Found by |
|---|-------|--------------------|------------|----------|
| 1 | 01-22 | walls stopped re-flowing when an adjoining wall was dragged | green | e2e `drag a wall and the adjoining rooms re-flow` |
| 2 | 02-14 | shift-click selected one item instead of adding to the selection | green | e2e `multi-select with shift and move as a group` |
| 3 | 03-30 | snapping engaged about 20px out after a device-pixel-ratio change | green | e2e `snap-to-grid engages within 8 device pixels` |
| 4 | 04-11 | undo after a rotate left the shape a fraction of a degree off | green | e2e `undo after a transform restores the exact geometry` |
| 5 | 05-27 | pasted furniture landed at the canvas origin | green | e2e `copy-paste places at the pointer, not the origin` |
| 6 | 06-08 | exported PDF cropped the right-hand rooms | green | e2e `export to PDF matches the on-screen bounds` |
| 7 | 07-19 | share links kept working after their expiry date | green | not found before release; reported by two customers |
| 8 | 08-25 | imported templates silently dropped the furniture layer | green | not found before release; reported by one customer |
