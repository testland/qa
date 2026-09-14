# How the payouts SDKs are built

`make sdks` runs the generator over `spec/openapi.yaml` and emits the Go,
Python and TypeScript packages. Every schema under `components.schemas` becomes
a type in all three packages whether or not a path references it; the generator
walks the components block, not the path tree.

The packages are published to their registries in the release run. Integrators
pin a major version. Of the forty on the API, nineteen are still on a v2.x SDK.
