# Tool-selection decision record format

Deep reference for the `framework-choice-advisor` SKILL.md. The output contract for writing down a chosen developer tool as a portable decision record: the observed project signal, exactly one primary recommendation, rationale that names the rejected alternative, what to read next, and a mandatory list of the conditions that would flip the choice.

The differentiation axis is output contract versus analysis: the SKILL.md
spine (and the vendor evaluation in
[vendor-evaluation.md](vendor-evaluation.md)) compare candidate tools on
their merits; this format governs only the shape of what gets committed once
the weighing is finished. Use both together: the analysis chooses, this
record preserves the choice.

## Overview

A tool gets chosen once and questioned for years. The choice survives in a
chat thread, the reasoning does not, and the next person either re-litigates
it from scratch or inherits it as folklore.

This format is a narrowed Architecture Decision Record. It keeps the ADR
skeleton and tightens three things generic ADR templates leave open - how
many tools may be recommended (Rule 1), what counts as admissible evidence
for the context (Rule 2), and whether the reversal conditions are optional
(Rule 3). It is tool-agnostic: the same record shape works for a test
framework, a package manager, a linter, a migration tool, a CI runner, or a
logging library.

## What this record is and is not

| This record | Not this record |
|---|---|
| The written artefact produced after a tool is picked | The comparison that picks it |
| One decision, one tool, one file | A matrix scoring every candidate on every axis |
| Evidence taken from the target project | Evidence taken from vendor feature pages |
| Expires when its own stated conditions occur | Expires when someone happens to notice it is stale |

## ADR provenance and field mapping

An ADR is "a document that captures an important architecture decision made along with its context and consequences" ([joelparkerhenderson/architecture-decision-record](https://github.com/joelparkerhenderson/architecture-decision-record)), and the canonical five-part shape is Title, Context, Decision, Status, Consequences ([Nygard, Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)). A tool choice is a decision of exactly that kind: it "addresses a functional or non-functional requirement that is architecturally significant" ([adr.github.io](https://adr.github.io/)).

| ADR field ([Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)) | Field here |
|---|---|
| Title | Title |
| Status | Status |
| Context ("the forces at play") | Signal, restricted to observed project evidence |
| Decision | Decision, restricted to one tool |
| Consequences ("all consequences ... not just the positive ones") | Rationale (the why-not clause) plus Flip conditions |

The split of Consequences into two fields is deliberate. Nygard requires that "all consequences should be listed here, not just the 'positive' ones" ([source](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)), and in practice tool records collapse to a list of benefits unless the negative half has its own heading with its own required content.

## The record fields

Eight fields. Seven are always required; the eighth appears only under the
co-equal rule below.

| Field | Required | Contents |
|---|---|---|
| Title | yes | Short noun phrase naming the decision, prefixed with a sequence number. Nygard specifies "short noun phrases" for ADR titles ([source](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)). |
| Status | yes | One of proposed, accepted, or superseded by a named later record. Per Nygard, "a decision may be 'proposed' if the project stakeholders haven't agreed with it yet, or 'accepted' once it is agreed" ([source](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)). |
| Signal | yes | The observed project evidence, quoted: file path plus the line or block that drove the detection. This is the ADR Context field, restricted to observable forces. |
| Decision | yes | Exactly one tool, written in active voice. Nygard's Decision field uses "full sentences, with active voice. 'We will ...'" ([source](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)). |
| Rationale | yes | Two clauses minimum: why the chosen tool fits the signal, and why not the strongest alternative that was considered. |
| Read next | yes | The one document the implementer opens first: the tool's setup guide, config reference, or migration guide. One link, not a reading list. |
| Flip conditions | yes | The specific future observations that would reopen this decision. |
| Secondary fallback | only for genuine co-equals | One alternative, with the constraint that would select it instead. |

## Rule 1: exactly one primary recommendation

A record names one tool in the Decision field. Two tools in that field is not a
decision, it is the reader's decision deferred.

This follows the ADR specificity convention: a well-written record "should be
about one AD, not multiple ADs"
([joelparkerhenderson/architecture-decision-record](https://github.com/joelparkerhenderson/architecture-decision-record)).

The one exception is a genuine co-equal: two candidates that the available
signal cannot separate, where the tiebreak depends on a constraint nobody has
stated yet (team size, an unwritten hiring plan, a language the team may or may
not adopt). Then, and only then:

1. Put the stronger-by-default candidate in Decision.
2. Put the other in Secondary fallback.
3. State the constraint that flips between them, in one line.

A Secondary fallback entry without that constraint line is a tiebreak handed
back to the reader. Delete it or complete it.

Never list a third option. If three candidates look co-equal, the signal was
too weak to write a record at all, and Rule 2 applies instead.

## Rule 2: every record rests on an observed signal

A recommendation is never inferred from a README, a project description, a
folder name, or what the team says the stack is. The Signal field must quote
one of:

| Admissible signal | Examples |
|---|---|
| A manifest | `package.json`, `pom.xml`, `pyproject.toml`, `*.csproj`, `Cargo.toml`, `go.mod` |
| A lockfile | `package-lock.json`, `pnpm-lock.yaml`, `poetry.lock`, `Gemfile.lock` |
| A tool config file | `playwright.config.ts`, `.eslintrc.json`, `tsconfig.json`, `Dockerfile`, a CI workflow file |
| An existing test or source directory with real contents | `tests/e2e/`, `src/androidTest/`, `migrations/` |

Inadmissible on its own: a README paragraph, a wiki page, a folder named after
a framework with nothing in it, a compiled artefact, or a verbal claim about
the stack. Each of these describes intent rather than state, and intent and
state diverge constantly.

This is the ADR Context field taken literally. Context "describes the forces at
play" in neutral language
([Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions));
a force that cannot be quoted from the repository is not yet a force, it is a
plan. Plans belong in Flip conditions, not in Signal.

**When no admissible signal exists, do not write a record.** Say so, name the
file that would resolve it, and stop. A record built on a guess is worse than
no record: it launders the guess into a citable decision.

## Rule 3: the flip conditions field is mandatory

Every record declares the observations that would reopen it. This is what keeps
a decision log from silently rotting into a set of unchallengeable defaults.

Good flip conditions are observable and specific:

- The project adds a second target platform.
- The service drops the ORM the chosen tool is built around.
- The suite passes 20 minutes of wall-clock time in CI.
- A non-JVM team takes ownership of this module.

Bad flip conditions are unfalsifiable: "if requirements change", "if the tool
stops meeting our needs", "on annual review".

If the author genuinely cannot foresee a reversal condition, the field says so
explicitly and gives the reason. An empty field reads as an oversight; a stated
"no foreseeable condition, because the choice is forced by the runtime" reads
as a claim a later reader can attack.

Flip conditions are also the confirmation hook. MADR carries an optional
Confirmation section describing how compliance with the decision gets verified
([MADR template](https://adr.github.io/madr/)); in this format the flip
conditions are what a periodic review actually checks.

## Rule 4: supersede, never edit

When a flip condition fires, the old record is not rewritten. Nygard: "If a
decision is reversed, we will keep the old one around, but mark it as
superseded"
([source](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)).
The same immutability guidance appears in the widely used ADR collection: when
an earlier decision becomes invalid, "a new ADR should be created" rather than
modifying the original
([source](https://github.com/joelparkerhenderson/architecture-decision-record)).

So: write a new record, set the old one's Status to superseded with a pointer,
and let the pair show the reader both the original reasoning and what changed.
The set of records accumulated this way is the project's decision log
([adr.github.io](https://adr.github.io/)).

## Template

```markdown
# <NNNN> - <tool category> for <component>

**Status:** <proposed | accepted YYYY-MM-DD | superseded by NNNN>

**Signal:**
<file path>:<line>
> <quoted excerpt that drove the detection>

**Decision:** We will use <exactly one tool>.

**Rationale:**
- Fits because: <one line tying the tool to the quoted signal>
- Not <strongest alternative>, because: <one line>

**Secondary fallback:** <tool | none>
<if present: the one constraint that would select it instead>

**Read next:** <the specific doc, guide, or config reference to open first>

**Flip conditions:**
- <observable event that reopens this decision>
- <observable event that reopens this decision>
```

Keep it to one screen. A tool record that runs to three pages has absorbed the
comparison it was supposed to summarize.

## Worked example

A billing service needs a database migration tool. The analysis has already
happened; this is the record it produces.

```markdown
# 0007 - Database migration tool for the billing service

**Status:** accepted 2026-07-19

**Signal:**
services/billing/pyproject.toml:14
> django = "^5.2"

services/billing/billing/migrations/0001_initial.py exists and is tracked.

**Decision:** We will use Django's built-in migrations.

**Rationale:**
- Fits because: the service's schema is already defined as Django ORM models,
  and Django ships a migrations system that propagates model changes into the
  database schema via `makemigrations` and `migrate`, storing migration files
  in a `migrations` directory inside each app
  (https://docs.djangoproject.com/en/5.2/topics/migrations/). The tracked
  `0001_initial.py` shows that history has already started here.
- Not Alembic, because: Alembic is "a lightweight database migration tool for
  usage with the SQLAlchemy Database Toolkit for Python"
  (https://alembic.sqlalchemy.org/en/latest/). Adopting it would mean
  maintaining a second schema definition alongside the Django models, and
  abandoning the migration history already committed.

**Secondary fallback:** none. The two candidates are not co-equal: the ORM in
the signal selects one of them outright.

**Read next:** the Django migrations topic guide
(https://docs.djangoproject.com/en/5.2/topics/migrations/), specifically the
sections on dependencies between app migrations and on squashing.

**Flip conditions:**
- The billing service moves off the Django ORM to SQLAlchemy.
- A second, non-Django service needs to share this migration history.
- The team adopts a database engine with no supported Django backend.
```

Note what the record does not contain: no scoring table, no third candidate, no
paragraph about either tool's community size. Everything in it is either quoted
from the project or cited to a document the reader can open.

## Review checklist

Reject a draft record that fails any line:

- [ ] Signal quotes a manifest, lockfile, config file, or a non-empty test or
      source directory, with a path.
- [ ] Decision names exactly one tool.
- [ ] Rationale contains an explicit why-not clause naming a real alternative.
- [ ] Every factual claim in Rationale is traceable to the signal or to a
      linked document.
- [ ] Read next points at one specific document, not a reading list.
- [ ] Flip conditions lists at least one observable event, or states why none
      is foreseeable.
- [ ] Secondary fallback, if present, carries the constraint that selects it.
- [ ] Status is set, and any reversal is a new record rather than an edit.
- [ ] The record fits on one screen.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Two tools in the Decision field | The reader still has to choose, so nothing was decided; it also breaks the one-decision-per-record convention ([source](https://github.com/joelparkerhenderson/architecture-decision-record)) | Promote one, demote the other to Secondary fallback with its selecting constraint |
| Signal reads "this is a Node project" | A folder shape is a description, not evidence, and it goes stale silently | Quote the manifest or lockfile line that proves it |
| Rationale lists only advantages of the winner | Consequences must include the non-positive ones ([source](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)) | Add the why-not clause and the cost the team is accepting |
| Flip conditions omitted or written as "revisit annually" | The record can never expire on evidence, so a stale choice outlives its reasons | Name observable events tied to the signal |
| The record is edited in place when the tool changes | The original reasoning is destroyed, so nobody can tell whether the reversal was justified | New record, old one marked superseded ([source](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)) |
| Rationale paraphrases the tool's marketing page | Unfalsifiable, and it will read as true forever regardless of the project | Tie each clause to the quoted signal or to a linked technical document |

## Limitations

- This format records a decision. It does not evaluate candidates, score them,
  or price them. The SKILL.md spine and
  [vendor-evaluation.md](vendor-evaluation.md) are the comparison side.
- The signal rule cannot see intent that exists only in people's heads. A
  planned migration off the current stack is invisible to a manifest, so it
  belongs in Flip conditions and must be volunteered by the team.
- Status vocabularies are not standardized. Proposed, accepted, and superseded
  are the minimum from the original ADR format; longer lifecycles such as
  initiating, researching, evaluating, implementing, maintaining, and sunsetting
  are also in use, and teams customize status values to fit their workflow
  ([source](https://github.com/joelparkerhenderson/architecture-decision-record)).
  Pick one vocabulary per decision log and keep it stable.
- A record is only as durable as the log it lives in. Records scattered across
  ticket comments do not form a decision log ([adr.github.io](https://adr.github.io/));
  keep them in one directory in the repository they describe.
