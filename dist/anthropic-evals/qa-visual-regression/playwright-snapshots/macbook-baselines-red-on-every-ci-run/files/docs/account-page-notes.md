# Account area - what is on the page (for whoever picks up the visual work)

Regions in the overview, top to bottom:

| Region                | Approx size | Notes                                             |
|-----------------------|-------------|---------------------------------------------------|
| Header + nav          | 1280 x 72   | contains the "last synced N minutes ago" line     |
| Plan card             | 980 x 240   | plan name, seat count, renewal date               |
| Usage table           | 980 x 1100  | 14 rows, seeded, deterministic                    |
| Invoice list          | 980 x 900   | 12 rows, seeded, deterministic                    |
| Support footer        | 1280 x 300  | static copy                                       |
| `#drift-chat` bubble  | 64 x 64     | fixed, bottom-right, present on every page        |

Everything on this page except the sync line and the chat bubble is driven by
the `acct-fixtures` seed and has been byte-stable across reruns on one machine
since we seeded it in July.
