# Handover - nightly #612

Seed patient P-88120 has three upcoming appointments, all with Dr Ferrar except
one. `-stubClinicalApi` serves them from the local stub.

The appointments tab used to call one endpoint. Since the 2026-09-08 deploy it
calls page 1 and then the unread-count endpoint before it publishes anything.
Measured against the stub on my laptop: 420 ms and 610 ms across ten runs.
Longer on the runner - I have seen 900 ms on a cold job.

The data itself is fine. Every row is correct once the tab has settled, and I can
drive all three of these tests by hand on the simulator without a single miss.

Nothing else shipped on 2026-09-08.
