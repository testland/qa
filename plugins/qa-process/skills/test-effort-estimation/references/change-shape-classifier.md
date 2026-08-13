# Change-shape classifier

Deep reference for the `test-effort-estimation` SKILL.md. Produces the change-shape distribution the estimator consumes: classifies a code change set into four shapes (pure-logic, service-layer, ui-heavy, data-heavy) from file-path and file-content signals, computes the shape distribution over a window of git history, and attaches a relative per-layer test cost model (unit 1x, service 3x, UI 10x) so downstream planning works from one shared input.

Every change set has a shape: the mix of layers its files touch. A sprint of
tax-rule refactors and a sprint of checkout-screen redesign produce the same
commit count and very different verification needs. The pyramid model names
three test layers (unit, service, UI) and shows cost and execution speed
increasing as you move up toward the higher-level tests
([Fowler, TestPyramid](https://martinfowler.com/bliki/TestPyramid.html), which
credits Mike Cohn's 2009 book *Succeeding with Agile* for popularizing the
model). That model describes where tests live. This classifier describes where
the *change* lives, which is the input the model needs.

The classification stops here. It does not carry a recommended
unit:service:UI target ratio, does not convert shapes into hours, and does
not pick which existing tests to run. Those are three separate downstream
decisions: pyramid balancing, effort estimation (the SKILL.md spine), and
test selection. Keeping the taxonomy in one place is the point: if the shape
definitions are copied into the estimator and the balancer separately, they
drift and the two answers stop agreeing.

## The four change shapes

Classification is per file first, then reduced to per commit (Step 3).

| Shape | What it means | Primary path signals | Content tie-breakers |
|---|---|---|---|
| `pure-logic` | Domain rules, calculations, transformations. No user-visible surface and no wire surface. | `src/domain/`, `core/`, `lib/`, `rules/`, `calc/`, plain model and value-object files | No import of an HTTP framework, ORM session, or view library. Pure functions, arithmetic, branching on domain state. |
| `service-layer` | Request handling, orchestration, persistence access, outbound integration. | `routes/`, `controllers/`, `handlers/`, `api/`, `services/`, `repositories/`, `resolvers/`, `consumers/`, `clients/` | Imports a router, request or response types, an ORM or query builder, an external SDK client, a queue consumer. |
| `ui-heavy` | Anything a user sees or clicks. | `components/`, `views/`, `pages/`, `screens/`, route segment files, `*.tsx`, `*.vue`, `*.svelte`, templates, stylesheets | Imports a view library, declares a component, contains markup or event handlers. |
| `data-heavy` | Schema, stored shape, and data movement. | `migrations/`, `db/migrate/`, `schema.sql`, `schema.prisma`, `models/` in a dbt project, `pipelines/`, `etl/`, `*.proto`, `*.avsc`, seed files | Contains DDL, an up/down migration pair, a schema version bump, a column type change, a data contract field. |

Two rules keep the table honest:

1. **Path first, content second.** The path signal decides unless the file
   content contradicts it. A file under `services/` that is a pure calculator
   with no I/O is `pure-logic`; a file under `lib/` that opens a database
   connection is not.
2. **Test files and config are excluded** from shape classification. They are
   the output of the decision, not evidence about the change.

## Step 1 - Collect the change set

For a window of history, list each non-merge commit with the files it touched.
`--since=<date>` shows commits more recent than the date, `--no-merges` drops
commits with more than one parent, `--name-only` prints the changed paths, and
`--pretty=format:` controls the header line
([git-log documentation](https://git-scm.com/docs/git-log)):

```bash
git log --since="90 days ago" --no-merges --name-only \
        --pretty=format:"COMMIT %H" > /tmp/changeset.txt
```

For a single pull request, use the diff against the merge base instead:

```bash
git diff --name-only origin/main...HEAD
```

For an epic that has not been implemented yet, there is no history to read.
Derive shapes from the story text and the areas it names, and record that the
distribution is predicted rather than measured (see Limitations).

## Step 2 - Classify each file

Apply the path rules first, then the content overrides, then drop excluded
paths (tests, config, lockfiles, generated). A file matches at most one shape;
with no surface signal it defaults to `pure-logic`. The runnable classifier
that mechanizes this is in the "Classification script" section below.

Read file content only when the path yields no match or when the path match is
being challenged. Reading every file in a 90-day window is slow and rarely
changes the answer.

## Step 3 - Reduce files to a per-commit shape

A commit gets one shape:

1. Count classified files per shape (ignore the excluded ones).
2. The plurality shape wins.
3. On a tie, break toward the shape whose verification is more expensive, in
   this order: `data-heavy`, then `ui-heavy`, then `service-layer`, then
   `pure-logic`.

The tie-break ordering is a convention of this reference, not a claim from the
cited sources. Its rationale: the cited pyramid shows cost rising toward the
top layers ([Fowler, TestPyramid](https://martinfowler.com/bliki/TestPyramid.html)),
and schema changes carry irreversible-migration risk, so a mixed commit is
safest labelled by its costliest component.

Record a `mixed` flag on any commit where no shape holds more than 50 percent
of its files. Mixed commits are the ones a human should look at.

## Step 4 - Compute the shape distribution

Aggregate per-commit shapes into a distribution. Report both commit share and
changed-file share: they diverge when one large screen rewrite lands in a
single commit while forty small logic commits land beside it.

```markdown
| Shape         | Commits | % commits | Files changed | % files |
|---------------|--------:|----------:|--------------:|--------:|
| pure-logic    |      42 |       30% |           118 |     22% |
| service-layer |      49 |       35% |           201 |     37% |
| ui-heavy      |      35 |       25% |           186 |     34% |
| data-heavy    |      14 |       10% |            38 |      7% |
| (mixed)       |       9 |         - |             - |       - |
```

Name the window explicitly (dates and commit count). A distribution without
its window is not comparable to the next one.

## Step 5 - Attach the relative test cost model

Each shape has a layer where most of its failure-detection value sits, and
each layer has a relative cost:

| Layer | Typical scope | Relative cost weight |
|---|---|---|
| Unit | Domain rules, isolated functions, a single class or method | 1x |
| Service | API contracts, integration points, database queries | 3x |
| UI / E2E | User-visible flows, cross-browser, accessibility | 10x |

| Change shape | Layer where verification lands | Weight |
|---|---|---|
| `pure-logic` | Unit | 1x |
| `service-layer` | Service | 3x |
| `ui-heavy` | UI / E2E | 10x |
| `data-heavy` | Service, plus dedicated data checks | 3x |

**Be clear about what these numbers are.** The *ordering* is grounded: the
pyramid shows cost and execution speed increasing as you move up the layers
([Fowler, TestPyramid](https://martinfowler.com/bliki/TestPyramid.html)), unit
tests run "very fast" while integration tests are "much slower" because of
external dependencies and end-to-end tests are "notoriously flaky" and
maintenance-heavy
([Fowler and Vocke, The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)),
and UI-driven end-to-end tests are "brittle, expensive to write, and time
consuming to run"
([Fowler, TestPyramid](https://martinfowler.com/bliki/TestPyramid.html)). The
specific values 1, 3, and 10 are **illustrative relative weights, not measured
constants**. No cited source publishes them. They exist so downstream steps
can do arithmetic against a shared scale. A team with a fast headless E2E rig
and a slow container-backed service suite should measure its own per-layer
wall-clock and runner cost and substitute real numbers.

Derive a cost-weighted shape index so two distributions can be compared:

```
weighted_index = sum(share_of_shape * layer_weight for each shape)
```

For the Step 4 table, using commit share:

```
0.30*1 + 0.35*3 + 0.25*10 + 0.10*3 = 0.30 + 1.05 + 2.50 + 0.30 = 4.15
```

A weighted index near 1 means the change stream is cheap to verify. An index
above roughly 5 means most verification pressure sits in the expensive
layers. The threshold is a reading aid, not a rule: what matters is the trend
across windows and the gap between two repositories, not the absolute number.

## Classification script

The runnable per-file classifier that mechanizes Step 2: path rules first,
content overrides second, excluded paths dropped. Save it as
`scripts/classify-change-shape.py` and pipe a `git log --name-only` stream
(Step 1) through it.

```python
# scripts/classify-change-shape.py
import re

PATH_RULES = [
    ("data-heavy",    r"(^|/)(migrations?|db/migrate|etl|pipelines?)/|"
                      r"schema\.(sql|prisma|graphql)$|\.(proto|avsc)$|seeds?/"),
    ("ui-heavy",      r"(^|/)(components?|views?|pages?|screens?|layouts?)/|"
                      r"\.(tsx|jsx|vue|svelte|css|scss|html)$"),
    ("service-layer", r"(^|/)(routes?|controllers?|handlers?|api|services?|"
                      r"repositor(y|ies)|resolvers?|consumers?|clients?)/"),
    ("pure-logic",    r"(^|/)(domain|core|lib|rules|calc|models?)/"),
]

CONTENT_OVERRIDES = [
    ("data-heavy",    r"CREATE TABLE|ALTER TABLE|ADD COLUMN|def upgrade\("),
    ("ui-heavy",      r"<[A-Z][A-Za-z]*|useState\(|render\(|@Component\b"),
    ("service-layer", r"@(Get|Post|Put|Delete)Mapping|app\.(get|post|put)\(|"
                      r"session\.query\(|createConnection\(|fetch\(|HttpClient"),
]

EXCLUDE = re.compile(r"(^|/)(tests?|spec|__tests__|e2e|fixtures?)/|"
                     r"\.(test|spec)\.|(^|/)(\.github|docs)/|"
                     r"(package-lock|yarn\.lock|Gemfile\.lock)")

def classify_file(path, content=""):
    if EXCLUDE.search(path):
        return None                      # not evidence about the change
    for shape, pattern in PATH_RULES:
        if re.search(pattern, path):
            path_shape = shape
            break
    else:
        path_shape = None
    for shape, pattern in CONTENT_OVERRIDES:
        if content and re.search(pattern, content):
            return shape if path_shape is None else path_shape
    return path_shape or "pure-logic"    # default: no surface signal found
```

How the code maps back to the rules: `EXCLUDE` is Rule 2 (test files and
config are not evidence); the `PATH_RULES` order encodes "path first";
`CONTENT_OVERRIDES` are the content tie-breakers applied only when a path
match is contested. Keep the three tables in sync with the "four change
shapes" table above - if a signal is added there, add it here too, or the
code and the prose drift apart.

## Output format

Emit one Markdown block containing, in order:

1. **Header** with the repository or change-set identifier and the exact
   window (dates and commit count).
2. **Distribution table**: shape, commits, percent of commits, files changed,
   percent of files, mapped layer, cost weight.
3. **Cost-weighted shape index** with the arithmetic shown, not just the result.
4. **Dominant shape** in one sentence, naming the directories that drove it.
5. **Divergences** between commit share and file share, when any shape differs
   by more than about 10 percentage points between the two views.
6. **Mixed commits** table for human triage.
7. **Not decided here**: an explicit line stating that target ratios, effort
   hours, and test selection are downstream decisions.

Keep section 7 even when it feels redundant. It is what stops a reader from
treating a classification as a plan.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Emitting a target unit:service:UI ratio alongside the distribution | Two capabilities then own the same decision and drift apart | Emit the distribution and the layer mapping only; let the balancing step choose the ratio |
| Counting test files as evidence of shape | The existing test mix is the thing under review, so using it as input makes the analysis circular | Exclude test paths in Step 2 |
| Reporting only commit share | One large screen rewrite in a single commit disappears | Report commit share and file share side by side |
| Classifying by path with no content check on ambiguous files | A calculator under `services/` gets labelled service-layer and inflates the expensive share | Apply the content tie-breakers when the path match is contested |
| Silently forcing every commit into one shape | Genuinely cross-cutting commits get an arbitrary label and no one notices | Flag commits with no >50 percent shape as `mixed` and list them |
| Treating 1x / 3x / 10x as measured facts | They are relative weights chosen for arithmetic, and no cited source publishes them | State them as illustrative and substitute measured per-layer cost when available |
| Comparing distributions from different-length windows | A 30-day and a 90-day window are not comparable | Always print the window; keep the window length fixed across reviews |

## Limitations

- **Path-based classification is a heuristic.** It labels location, not
  behavior. The classic failure is the mirror image on the test side: a file
  under `__tests__/cart.test.ts` that opens a real database connection is an
  integration test, because tests that involve databases are integration
  tests rather than unit tests
  ([Fowler and Vocke, The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)).
  The same confusion happens to production files: a module under `lib/` that
  issues queries is service-layer work no matter where it sits. Content
  tie-breakers reduce this but do not eliminate it, so review the `mixed` list.
- **Monorepos need per-package runs.** A single distribution across a frontend
  package and three backend services averages away the signal that would drive
  any decision. Classify per package, then aggregate if you must.
- **Vendored, generated, and lockfile paths pollute file counts.** Exclude
  generated clients, build output, and lockfiles explicitly, or a codegen
  refresh reads as a large service-layer change.
- **Predicted shapes are weaker than measured ones.** For unimplemented epics
  the classification comes from story text, which reflects how the work was
  described rather than how it will land. Mark the output as predicted and
  re-run it once code exists.
- **Squash-merge history hides shape.** When every pull request lands as one
  squashed commit, commit share and file share converge and the mixed-commit
  count rises. Prefer the file-share column on squash-merge repositories.
- **The layer mapping is a default, not a law.** A `data-heavy` change to a
  contract consumed by a browser client may need UI-layer verification too.
  The mapping picks the layer where most of the value sits, not the only
  layer that applies.

## References

- [Fowler, TestPyramid](https://martinfowler.com/bliki/TestPyramid.html) - the
  three layers (unit, service, UI); "you should have many more low-level
  UnitTests than high level BroadStackTests running through a GUI"; UI-driven
  end-to-end tests are "brittle, expensive to write, and time consuming to run";
  cost and execution speed increase toward the top of the pyramid; Mike Cohn
  popularized the model in *Succeeding with Agile* (2009).
- [Fowler and Vocke, The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html):
  Cohn's original three layers; unit tests run "very fast" while integration
  tests are "much slower" and end-to-end tests are "notoriously flaky"; tests
  involving databases are integration tests, not unit tests.
- [git-log documentation](https://git-scm.com/docs/git-log) - `--since=<date>`
  shows commits more recent than the date; `--no-merges` excludes commits with
  more than one parent; `--name-only` is a supported non-patch diff format;
  `--pretty=format:` takes a printf-like format string.
