---
name: tool-selection-decision-record
description: "Defines the output contract for writing down a chosen developer tool as a portable decision record: the observed project signal, exactly one primary recommendation, rationale that names the rejected alternative, what to read next, and a mandatory list of the conditions that would flip the choice. Adapts Architecture Decision Record conventions (context, decision, consequences, status, supersede rather than edit) to tool selection, and refuses any recommendation inferred from a README or a folder name instead of a manifest, lockfile, config file, or existing test directory. Distinct from a catalog or advisor that compares candidate tools on their merits: this owns the shape of the written record, not the comparison. Use when a tool has just been chosen (test framework, build tool, linter, package manager, migration tool) and the choice needs to be recorded so a later reader can see the signal, the rejected alternative, and what would reverse it."
---

# tool-selection-decision-record

## Overview

A tool gets chosen once and questioned for years. The choice survives in a
chat thread, the reasoning does not, and the next person either re-litigates
it from scratch or inherits it as folklore.

This skill defines a single, portable record format for that moment: a narrowed
Architecture Decision Record. It keeps the ADR skeleton and tightens three things
generic ADR templates leave open - how many tools may be recommended (Rule 1),
what counts as admissible evidence for the context (Rule 2), and whether the
reversal conditions are optional (Rule 3). The ADR provenance and full field
mapping are in [references/adr-background.md](references/adr-background.md).

It is tool-agnostic. The same record shape works for a test framework, a
package manager, a linter, a migration tool, a CI runner, or a logging library.

## What this record is and is not

| This record | Not this record |
|---|---|
| The written artefact produced after a tool is picked | The comparison that picks it |
| One decision, one tool, one file | A matrix scoring every candidate on every axis |
| Evidence taken from the target project | Evidence taken from vendor feature pages |
| Expires when its own stated conditions occur | Expires when someone happens to notice it is stale |

The differentiation axis is output contract versus analysis. Any catalog,
scoring matrix, or advisory workflow that weighs candidate tools against each
other on their merits is a different concern and produces different output.
This skill governs only the shape of what gets committed once the weighing is
finished. Use both together: the analysis chooses, this record preserves the
choice.

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

The eight fields map onto the canonical five-part ADR (Title, Status, Context, Decision, Consequences), with ADR Consequences deliberately split into two fields here: Rationale (the why-not clause) plus Flip conditions. The full field-to-ADR mapping and its rationale are in [references/adr-background.md](references/adr-background.md).

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

A filled record - a billing service choosing Django's built-in migrations over
Alembic, with the signal quoted from `pyproject.toml`, the why-not clause, and
observable flip conditions - is in [references/worked-example.md](references/worked-example.md).

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
  or price them. Pair it with whatever comparison method the team already uses.
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
