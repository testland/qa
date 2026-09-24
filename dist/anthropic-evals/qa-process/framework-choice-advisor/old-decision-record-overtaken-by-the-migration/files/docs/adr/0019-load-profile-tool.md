# 0019 - Load profile tool for the storefront

**Status:** accepted 2023-06-29

**Context:** The load profile is maintained by the platform group, who are a
JVM shop, and the checkout plan has to drive the same session cookie the Java
integration suite already produces.

**Decision:** Apache JMeter, with the plan committed under `perf/`.

**Consequences:** The plan is XML edited in a GUI, so diffs are large and
review of them is shallow. The nightly job is the only place it runs.

**Revisit when:**
- The nightly perf job stops running the committed JMeter plan.
- A team without JVM tooling takes ownership of the load profile.
- The load profile has to run inside the browser end-to-end pipeline.
