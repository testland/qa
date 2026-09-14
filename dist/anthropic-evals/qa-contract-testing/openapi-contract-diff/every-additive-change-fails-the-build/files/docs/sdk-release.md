# SDK release - cards-api

The four SDK packages (Go, Python, TypeScript, Java) are generated from
`spec/openapi.yaml` at tag time and published to their registries in the same
run. Integrators pin a major; the median integrator upgrades an SDK about twice
a year, and eleven of the forty are still on a 4.x SDK.

There is no staging window between the tag and the registry push.
