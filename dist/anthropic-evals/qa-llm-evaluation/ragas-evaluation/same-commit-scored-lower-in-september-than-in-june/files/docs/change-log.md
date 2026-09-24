# Docs assistant, summer 2026

- **2026-06-04** Gate thresholds baselined from commit a91f3c2.
- **2026-07-11** Golden set frozen at 80 rows. No change since.
- **2026-08-30** Vector index rebuilt, ticket infra-4471. Manifests from either
  side of the rebuild are saved under `artifacts/`.
- **2026-09-02** Tag re-run against the cached spring wheelhouse.
- **2026-09-10** Tag re-run against the current job.

No application code, prompt or retriever change has landed on the assistant
since 2026-06-04. The tag is the same commit in all three runs.
