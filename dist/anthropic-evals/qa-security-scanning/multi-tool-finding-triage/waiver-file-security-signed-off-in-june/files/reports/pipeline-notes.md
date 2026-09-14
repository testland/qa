# Notes on the 9.4 dependency gate, from the platform team

- This gate covers the dependency and container CVE domain only. SAST, secrets
  and IaC run in their own jobs against their own thresholds and are not in
  scope here.
- Two scanners feed it: trivy 0.58.1 and grype 0.87.0. Both ran on the release
  commit; the attached findings file is the merged result and the `caught_by`
  field records which of them produced each row.
- grype reports operating-system packages under the vendor advisory id the
  distro published, not the upstream identifier. The merge step keeps whatever
  id the scanner reported in `cve` and lists every other identifier the advisory
  maps to in `aliases`.
- `data/feeds/` holds snapshots taken at build time and committed next to the
  report, so a rerun of this commit reproduces exactly.
- The threshold is `critical`, set when the gate was written in 2024 and not
  revisited since.
- `ci/run-gate.js` exits non-zero on BLOCK, which is what fails the pipeline
  job. Nothing else in the job inspects the verdict.
