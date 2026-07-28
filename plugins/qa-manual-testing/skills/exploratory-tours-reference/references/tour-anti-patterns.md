# Tour anti-patterns

Deep reference for `exploratory-tours-reference` SKILL.md. Failure modes
that turn a tour from a focusing lens into wasted session time, with the
fix for each.

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Picking all 7 tours for one session | Tester touches each superficially; no depth. | 1-3 tours per 90-min session. |
| Money tour without monetary fields | The tour wastes time on "verify nothing changed." | Pick tours per the feature; not all features need every tour. |
| Garbage collector's tour without a sitemap | Tester misses pages; coverage gaps invisible. | Use the team's sitemap / docs as the seed list. |
| Treating a tour as a checklist | Tour is a heuristic; rigid stepwise application defeats the exploration. | Tester adapts mid-tour as they learn (per the exploratory definition). |
| Bad-data tour with random inputs | Random isn't useful; structured pathological inputs are. | Use canonical payloads (`malicious-payload-bank`). |
| Intellectual tour without a domain expert pair | Tester misses the actual complexity; tour is shallow. | Pair with someone who knows the domain. |
| One tour run per release without rotation | The same tour by the same tester catches the same bugs (or none). | Rotate which tours run, which testers, what scope (Picking section). |
