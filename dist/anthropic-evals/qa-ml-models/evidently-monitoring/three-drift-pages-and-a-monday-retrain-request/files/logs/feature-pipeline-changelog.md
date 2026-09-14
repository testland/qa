# feature-pipeline CHANGELOG

## 4.9.0 - 2026-09-06

- Merchant identifier digest moved from md5 to sha256, truncated to 16 chars.
  Applies to the online writer and to the `features-batch` job.
- Enrichment call retry budget raised from 2 to 3.
- Dropped the deprecated `pos_entry_legacy` passthrough.

## 4.8.3 - 2026-08-19

- Timezone fix in the hour-of-day derivation for issuer_country = UY.

## 4.8.2 - 2026-08-04

- Dependency bumps only.
