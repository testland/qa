# How the payouts SDKs are built

`make sdks` runs the generator over `spec/openapi.yaml` and emits the Go,
Python and TypeScript packages. They are published to their registries in the
release run, in the same job as the tag.

Integrators pin a major version. Of the forty on the API, nineteen are still on
a v2.x SDK and upgrade when they get round to it. Six of the forty use no SDK at
all and hand-write their clients against the spec we publish.
