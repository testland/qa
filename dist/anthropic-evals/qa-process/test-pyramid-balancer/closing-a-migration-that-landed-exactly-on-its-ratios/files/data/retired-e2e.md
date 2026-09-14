# harbor - end-to-end cases retired during Q2

427 cases came out of the end-to-end suite between 2026-04-07 and 2026-09-11.
Every retirement commit records a `replaced-by:` trailer. Grouped by what that
trailer says:

| Cases | `replaced-by:` trailer                                    |
|------:|-----------------------------------------------------------|
|    96 | `feature-removed` — the product surface itself was deleted in Q2 (legacy invoicing UI, v1 export, the old admin console) |
|    84 | a named integration test, e.g. `test/integration/fees-boundary.test.js` |
|    11 | a named unit test, e.g. `test/unit/date-window.test.js`     |
|   236 | `none` — trailer present, value `none`                     |

The 236 with `none` break down by the area they covered:

| Cases | Area                                    |
|------:|-----------------------------------------|
|    71 | permission matrix evaluation            |
|    58 | statement and receipt formatting        |
|    44 | fee and interest arithmetic             |
|    33 | date-window and cut-off handling        |
|    30 | export column ordering and escaping     |

None of these five areas has been removed from the product. All five are
listed in the approved plan as the assertions to move down to the unit layer.
