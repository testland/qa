# Where these files come from

- `e2e-stats.jsonl` - regenerated every Monday from the CI history API. Trusted.
- `value-tiers.json` - set by the owning team at the start of each quarter.
- `regressions.json` - maintained by hand by our previous QA lead, who left in
  May. It was only updated when somebody remembered to tell him, and nobody has
  touched it since. Its numbers cover roughly the last twelve months.
- `feature-status.md` - maintained by the PM, current as of last week.
- `incidents/` - the postmortem record. Every priority-1 and priority-2
  incident since January has one, and writing it is mandatory before the
  incident can be closed.
