# Org test-health dashboard - ingest status

Every product in the company reports its test results into one dashboard.
Reporting into it is a platform requirement rather than a preference
(PLAT-118); it is where release sign-off reads pass rates, per-test history
and flake ranking from. The ingester runs nightly against each product's
build-artifact bundle and has not changed this year.

Latest nightly output for this product:

    [ingest] kestrel-web: fetching build artifact bundle for run 4531
    [ingest] kestrel-web: bundle contains playwright-report/index.html,
             playwright-report/data/3f2a91c4.zip, playwright-report/assets/*
    [ingest] kestrel-web: no machine-readable test results found in bundle
    [ingest] kestrel-web: 0 tests recorded
    [ingest] kestrel-web: 41 consecutive nights with no results for this product

For comparison, the four other products on this pipeline account all ingest
cleanly and have per-test history going back to 2024.
