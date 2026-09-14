# Image scanning obligations (approved 2026-04-02)

Three commitments were made outside the platform team and none has been
revisited since.

**Legal — D. Okonjo.** The licences bundled into any image we publish to the
internal registry must be enumerated at least once a week, and the enumeration
retained. GPL-family findings are reviewed monthly at the licensing sync.

**Hardening review — M. Prieto.** Dockerfile and runtime configuration checks
must cover every image that reaches the internal registry, and must do so before
that image is published there. No image is exempt. Cadence was not otherwise
specified and no per-pull-request requirement was discussed.

**Security — R. Adeyemi.** Checks for credentials and other secrets baked into
the image run on every change, without exception. This one was written after the
2025 incident and R. Adeyemi has said in writing that he will not renegotiate it.

None of the three names a tool and none of them mentions pull requests.
