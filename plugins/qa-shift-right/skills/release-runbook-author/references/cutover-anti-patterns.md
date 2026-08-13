# Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| A metric threshold wired to automatic rollback | The threshold cannot choose between rolling back, rolling forward, and redeploying known-good, and in a multi-team window it cannot know how many other teams must reverse with it | Thresholds halt and page; the named release authority decides (see the rule section) |
| One org-wide go or no-go at the end of the window | Failures surface only after every service has cut over, so the reverse path is at its longest and most entangled | A DECISION gate per service, in dependency order, before its dependents start |
| A gate owned by a team name or a rota alias | At 02:00 nobody is sure who is allowed to say stop, and two people act concurrently | Exactly one named person per gate, availability confirmed in advance |
| Timeboxes with no hard-stop policy | Teams read a timebox as a target, gates slip individually, and the window silently overruns | One hard-stop time for the window with a stated consequence, and extension only as its own DECISION gate |
| Rolling back in forward order | The dependency reverses while its dependent still calls the new contract, turning a bad release into an outage | Reverse the completed prefix of the gate list, confirming each step |
| A rollback list with scope but no order and no owners | The reverse becomes a second uncontrolled cutover under time pressure | Ordered reverse steps, one owner each, confirmation between steps |
| A state-writing gate treated as reversible | The plan promises a reversal that physically cannot happen | Mark `POINT OF NO RETURN`, or make the schema support both versions before the window |
| A 10-minute gate described as a bake period | Published guidance measures bake time in hours and days, not minutes, so the window is buying smoke coverage while claiming bake coverage | Call it a smoke check, or split the window so dependents run on a later day |
| A dependency cycle scheduled anyway | The graph cannot be ordered, so the sequence is fiction and the first gate exposes it | Break the cycle before scheduling, with a both-versions-tolerant contract or a flag |
