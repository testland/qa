# api-fuzz on branch fix/hermetic-fuzz, run 2026-09-10 - PASSED

44 operations selected, 5 examples each, 8 workers. Wall clock 38 seconds.
0 failures. Checks reporting: status code, response schema, content type,
server error.

| Operation                      | Examples | Failures |
|--------------------------------|----------|----------|
| GET /v1/accounts               | 5        | 0        |
| GET /v1/exports/{id}/download  | 5        | 0        |
| GET /v1/statements/{id}/pdf    | 5        | 0        |
| POST /v1/transfers             | 5        | 0        |
| ... 40 further operations      | 200      | 0        |

Priya's note on the run: "green first time, no flakes across four re-runs."
