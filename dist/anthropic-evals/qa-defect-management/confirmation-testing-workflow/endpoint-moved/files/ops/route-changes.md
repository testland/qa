# Export routes - 4.0 (2026-06-15)

| Before | After |
|---|---|
| `POST /v1/exports`, workspace id in the body | `POST /v2/workspaces/:id/exports`, workspace id in the path |
| body field `format`, defaulting to `csv` | body field `format`, defaulting to `json` |

`POST /v1/exports` was removed, not aliased. It returns 410 Gone.
The handler for the v2 route is `postWorkspaceExport` in
`src/exportRoutes.js`; `buildExport` is unchanged from v1 apart from the fix
in `3ad81c9`.
