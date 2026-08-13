# The four golden signals

Reference for `chaos-drill-protocol` Gate 3 (live observability). The signals a
drill confirms and aborts on are the ones its abort criteria name. A useful
default set is the four golden signals from Google's SRE monitoring chapter
([sre.google/sre-book/monitoring-distributed-systems][sre-mon]).

| Signal | Definition ([sre.google/sre-book/monitoring-distributed-systems][sre-mon]) |
|---|---|
| Latency | "The time it takes to service a request. It's important to distinguish between the latency of successful requests and the latency of failed requests." |
| Traffic | "A measure of how much demand is being placed on your system, measured in a high-level system-specific metric." |
| Errors | "The rate of requests that fail, either explicitly (e.g., HTTP 500s), implicitly (for example, an HTTP 200 success response, but coupled with the wrong content), or by policy." |
| Saturation | "How 'full' your service is. A measure of your system fraction, emphasizing the resources that are most constrained." |

Gate 3 passes only when fresh samples for every abort-criterion signal have
arrived within the last sampling interval. Stale dashboards fail the gate as
hard as missing ones: without live signals the drill has no abort path that
fires on evidence, which makes it a fault injection with no stopping rule rather
than a riskier drill.

[sre-mon]: https://sre.google/sre-book/monitoring-distributed-systems/
