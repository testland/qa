# How the API document is produced

- `scripts/build.sh` runs `openapi-gen` over the handler package on every build.
  It writes `openapi.yaml` and bakes that file into the image, and the deployed
  service serves the same document at `/openapi.json`.
- Committing the regenerated file back into this repository is a manual step.
  `git log openapi.yaml` shows the last commit in February.
- The handler annotations that `openapi-gen` reads live in
  `brightline/api-handlers`, a separate repository.
