# Release close-out (run right after the release call)

Query used to collect the tickets:

    project in (ENG, OPS) AND (fixVersion >= "2026.06.15" OR labels = "release-2026.06.15")

Then, for every key the query returned:

    POST /rest/api/3/issue/{key}/transitions
    body: {"transition": {"id": "31"}}

Notes from last time:
- id 31 is "Close Issue" on the ENG board, someone confirmed it in March
- if a key 400s, skip it and carry on so the run finishes
- takes about two minutes for the whole board
