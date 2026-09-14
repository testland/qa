# ADR-0031: scan the artifact once, carry the verdict

Status: proposed (in review 3 weeks)   Author: @tvaldes (principal)
Read by: release board 2026-09-04, no objections recorded

## Context

A container image is content-addressed. The bytes behind
`sha256:c41e7b9a0f28` today are the bytes that were there at merge and the
bytes that will be there in a year. We currently scan those bytes at merge and
again at release, and today the two runs disagreed. A gate whose verdict on
fixed input is not stable is not a gate; it is a coin flip with a CI bill.

## Decision

1. The pull-request job scans the pushed digest. That run is authoritative.
2. Its verdict is written to the artifact store keyed by digest.
3. The release job looks up the verdict for the digest it was asked to release
   and fails if it is not `pass`. It does not scan.

## Consequences

- One artifact, one answer, for the life of the artifact.
- Roughly four minutes off every release.
- Re-running a release scan to get a different answer stops being possible,
  which is most of what we argue about.
