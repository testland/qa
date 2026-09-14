# External review - members API, extract

Reviewer: Halden Assurance, engagement 2026-09-01 to 2026-09-03.
Scope: read-only checkout at `9f21c04`. No database or staging access granted.

## Finding R-7 (rated High)

None of the three Redis keys in the members API carries the organisation
identifier:

    profile:{memberNo}
    prefs:{personId}
    org:{tenantId}

Keys that omit the organisation identifier risk serving one organisation's data
to another when a single cache instance is shared across organisations.

**Recommendation:** prefix all three keys with the organisation identifier.

**Client response due:** 2026-09-12.
