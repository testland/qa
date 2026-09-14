# checkout-api container pipeline

- Image: `checkout-api:2026.09.2`, built 2026-09-12 from commit `a41f8d0`.
  Purl for this build is `pkg:oci/checkout-api@2026.09.2`.
- Previous build was `checkout-api:2026.08.1`, cut on 2026-08-14. It is still in
  the registry because two regions have not rolled forward yet.
- Scanners: grype 0.87.0 and the registry's built-in scanner (version not
  reported in its output). Both ran; both produced output; the attached list is
  the merged result.
- Gate threshold: `critical`.
- Feeds are pinned per build: `data/epss.csv` and `data/kev.json` are the
  snapshots taken at build time and committed next to the report. Nothing in the
  pipeline reads them.
- VEX document: `data/openvex.json`, maintained by AppSec, currently at version
  3. It accumulates statements across builds rather than being rewritten per
  image.
- Freeze: Friday 2026-09-18 17:00 UTC. Sprint capacity agreed with the team is
  five CVE fixes.
