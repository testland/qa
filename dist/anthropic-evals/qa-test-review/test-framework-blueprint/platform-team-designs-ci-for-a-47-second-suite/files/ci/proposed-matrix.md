# Proposed CI pipeline - kestrel-web

Author: @marek.z (Platform), drafted 2026-09-07

## Job matrix

    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4, 5, 6, 7, 8]
        browser: [chromium, firefox, webkit]
        image: [ubuntu-24.04, ubuntu-22.04]

Command per job:

    npx playwright test --project=$BROWSER --shard=$SHARD/8

That is 48 jobs per pipeline run.

## Config changes

- `retries: 3` when CI is set. The runners are spot instances and we lose one
  to eviction roughly once a week; three attempts covers it comfortably.
- `workers: 1` inside each shard, so shards do not contend for CPU.
- Reporter stays `html`. The report directory is uploaded as a build artifact
  and published to the pipeline S3 bucket, where anyone can open it.

## Runner image

Browser binaries are baked into a custom image, so the 55 seconds of
`playwright install` per job goes away. This is already built and available
as `ghcr.io/kestrel/ci-playwright:1.55.0`.

`fail-fast: false` because one shard going red should not cancel the other
forty-seven - you want the whole picture on a failing run, not the first
failure.

## Triggers

The same job runs on every push to every branch, and again nightly. One
definition, no special cases - easier for me to maintain.
