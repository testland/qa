# Release checklist - exports-api

1. Tag the release branch.
2. The pipeline copies that run's comparison report to
   `artifacts/breaking-latest.json` and runs `npm run gate`.
3. The pipeline step halts the release on a non-zero exit status from that
   command. Nothing else in the pipeline inspects the gate's output; the printed
   verdict is for the release engineer reading the build page.
4. Publish the SDKs.
5. Post the release note in #api-announce.
