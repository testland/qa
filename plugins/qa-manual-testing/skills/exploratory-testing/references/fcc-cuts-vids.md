# FCC CUTS VIDS - Kelly's touring heuristic

Deep reference for `exploratory-testing` SKILL.md. FCC CUTS VIDS is Michael
Kelly's touring heuristic, published on his blog on 20 September 2005. It
names **eleven tours**, each a short reconnaissance pass over an application
with one question in mind. Kelly introduced it as a companion to his
test-reporting heuristic, writing "I think I will need something similar for
application touring. Here is my attempt: FCC CUTS VIDS"
([michaeldkelly.com](https://michaeldkelly.com/blog/2005/9/20/touring-heuristic.html)).

The tours answer *what does this product even consist of* - they are
aimed at a tester who does not yet know the application. That is the
axis that separates them from Whittaker's seven tours
([tours.md](tours.md)), which come from *Exploratory Software Testing*
(2009) and frame a themed bug hunt on a product the tester already
understands. Kelly's tours precede that work by four years and are used
earlier in the lifecycle: recon first, mission after.

## When to use

- **Onboarding** onto an unfamiliar product, before any charter is
  written.
- **Inheriting an area** nobody on the team has tested recently.
- **Opening a first session** on a feature whose shape is unknown, to
  decide what is worth chartering at all.
- **Filling a gap mid-session** when the tester realises they cannot
  answer a basic question about the system.

Do not reach for this once the product is well understood; at that point
a themed mission from [tours.md](tours.md) is the better tool.

## How to use

1. **Pick a target.** One application, or one area of it, in a sentence.
2. **Run a subset of tours, not all eleven.** Each is a short pass with
   one question. Three or four chosen for the unknowns that actually
   matter beat a mechanical sweep through the full list.
3. **Take notes per tour** so the pass produces a record, not just a
   feeling of familiarity.
4. **Convert the gaps into charters.** A tour that raises more questions
   than it answers has found the area worth a session. Charter and
   time-box those per the umbrella SKILL.md.

## The eleven tours at a glance

Each description is Kelly's own wording.

| Group | Tour | Kelly's description |
|---|---|---|
| **FCC** | **F - Feature** | "Move through the application and get familiar with all the controls and features you come across." |
| | **C - Complexity** | "Find the five most complex things about the application." |
| | **C - Claims** | "Find all the information in the product that tells you what the product does." |
| **CUTS** | **C - Configuration** | "Attempt to find all the ways you can change settings in the product in a way that the application retains those settings." |
| | **U - User** | "Imagine five users for the product and the information they would want from the product or the major features they would be interested in." |
| | **T - Testability** | "Find all the features you can use as testability features and/or identify tools you have available that you can use to help in your testing." |
| | **S - Scenario** | "Imagine five realistic scenarios for how the users identified in the user tour would use this product." |
| **VIDS** | **V - Variability** | "Look for things you can change in the application - and then you try to change them." |
| | **I - Interoperability** | "What does this application interact with?" |
| | **D - Data** | "Identify the major data elements of the application." |
| | **S - Structure** | "Find everything you can about what comprises the physical product (code, interfaces, hardware, files, etc...)." |

The User and Scenario tours are ordered: Scenario builds on the personas
the User tour produced, so run User first.

## The eleven tours in full

Each tour below quotes Kelly's own one-line description verbatim. The
**prompts** and **worked example** under each are elaboration for this
catalog, not Kelly's text.

Running example throughout: a self-serve expense-reporting web app the
tester has never opened before.

### FCC - the product shape

#### F - Feature tour

> "Move through the application and get familiar with all the controls and features you come across."

**Prompts**
- What is on every screen reachable without special permissions?
- Which controls are visible but disabled, and under what condition do
  they enable?
- What exists in menus that has no obvious entry point in the UI?

**Worked example.** Clicking every nav item surfaces a "Recurring
expenses" screen that appears in no onboarding material. Nobody on the
team mentions it. That absence is the finding.

#### C - Complexity tour

> "Find the five most complex things about the application."

**Prompts**
- Which screen has the most fields, states, or conditional logic?
- Where does the product ask the user to make the hardest decision?
- What would be hardest to explain to a new colleague?

**Worked example.** The five: multi-currency conversion, approval-chain
routing, receipt OCR, the mileage calculator, and per-country tax rules.
Complexity concentrates risk, so this list is usually the first draft of
a charter backlog.

#### C - Claims tour

> "Find all the information in the product that tells you what the product does."

**Prompts**
- What do the marketing pages, in-product tooltips, help centre, and
  release notes promise?
- Where do two of those sources disagree?
- What does the product claim about limits, formats, or timing?

**Worked example.** The pricing page says receipts are processed
"instantly"; the in-app tooltip says "within a few minutes". Both are
claims, and they conflict. That conflict is testable, and it is also
material for [hiccupps-f.md](hiccupps-f.md), where Claims is one of the
oracles.

### CUTS - the usage shape

#### C - Configuration tour

> "Attempt to find all the ways you can change settings in the product in a way that the application retains those settings."

**Prompts**
- What is settable per user, per team, and per organisation?
- Which settings survive logout, and which silently reset?
- What is configurable only by an administrator or only by support?

**Worked example.** The default currency is settable per user, but
resets to the org default after a session expires. Persistence is the
part of the tour that matters: a setting that does not stick is a
different product than the one the settings screen advertises.

#### U - User tour

> "Imagine five users for the product and the information they would want from the product or the major features they would be interested in."

**Prompts**
- Who are five distinct people who touch this, and what does each want
  from it?
- Which of them never log in but are affected by it anyway?
- Whose needs conflict?

**Worked example.** A field engineer filing from a phone, a manager
approving in bulk, a finance analyst exporting for reconciliation, an
auditor reading historical records, and an admin configuring policy.
The analyst and the auditor want opposite things from data retention.

Run this tour before the Scenario tour, which depends on its output.

#### T - Testability tour

> "Find all the features you can use as testability features and/or identify tools you have available that you can use to help in your testing."

**Prompts**
- What logs, debug views, health endpoints, or admin panels exist?
- Can state be set up directly, or only through the UI?
- What is available for generating or resetting data?

**Worked example.** An admin "impersonate user" action removes the need
to hold five sets of credentials, and a CSV import can seed a hundred
expenses in one step. Both cut session setup time, which is the
constraint the SBTM TBS metrics care about
([session-sheet-and-metrics.md](session-sheet-and-metrics.md)).

#### S - Scenario tour

> "Imagine five realistic scenarios for how the users identified in the user tour would use this product."

**Prompts**
- What does each persona from the User tour do end to end, on a normal
  day?
- Which scenario crosses the most features?
- What does the unhappy version of each scenario look like?

**Worked example.** The field engineer photographs a receipt in a
basement with no signal, files it later, and the manager approves it
from an email link while travelling. That scenario crosses offline
capture, sync, deep linking, and approval - four areas one tour surfaced
together.

### VIDS - the data and system shape

#### V - Variability tour

> "Look for things you can change in the application - and then you try to change them."

**Prompts**
- Which fields accept free input, and what do they accept?
- What can be reordered, renamed, deleted, or bulk-edited?
- What changes state as a side effect of changing something else?

**Worked example.** An expense category can be renamed after reports
referencing it are submitted. Whether historical reports show the old or
new name is a real question the tour raises but does not answer.

Note the overlap with SFDPOT ([sfdpot.md](sfdpot.md)): variability is
about *finding* what can change, SFDPOT is about *systematically
varying* it once found.

#### I - Interoperability tour

> "What does this application interact with?"

**Prompts**
- What does it authenticate against, import from, export to, or notify?
- Which integrations are optional, and what breaks when one is off?
- What talks to it that the team does not own?

**Worked example.** Single sign-on, a corporate card feed, an accounting
export, and an email notification service. The card feed is the one
nobody on the team controls, which makes it the first candidate for
contract-level attention.

#### D - Data tour

> "Identify the major data elements of the application."

**Prompts**
- What are the main entities, and how do they relate?
- Which fields are required, unique, or bounded?
- What data outlives the user who created it?

**Worked example.** Expense, Report, Approval, Policy, User. An Approval
references a User who may later be deactivated, which raises the
question of what an audit view shows for a departed employee.

#### S - Structure tour

> "Find everything you can about what comprises the physical product (code, interfaces, hardware, files, etc...)."

**Prompts**
- What are the deployable pieces, and where do they run?
- What file formats, APIs, and storage does it own?
- What is the client, and what is the server?

**Worked example.** A React front end, a REST API, a background OCR
worker, object storage for receipt images, and a nightly export job. The
worker and the export job have no UI, so nothing in the Feature tour
would have found them.

## Turning a tour into a charter

A tour produces questions; a charter answers one. When a tour surfaces
something worth pursuing, charter it with a stated mission and a time
box ([charter-template.md](charter-template.md)). The Complexity and
Claims tours tend to generate the most charter-worthy material, because
both surface places where the product's stated behaviour and its actual
behaviour can diverge.

## Anti-patterns

| Anti-pattern | Why it fails | Do instead |
|---|---|---|
| Running all eleven tours on every product | The heuristic is a menu, not a checklist; eleven shallow passes crowd out one useful one | Pick the tours that target what is actually unknown |
| Treating a tour as a test pass | A tour builds familiarity; it is not coverage and finds bugs only incidentally | Charter a session for the risks the tour surfaced |
| Confusing these with Whittaker's tours | Different author, different set, different lifecycle stage | Kelly's eleven for recon, [tours.md](tours.md) for themed missions |
| Attributing the mnemonic to James Bach | It is Kelly's, from his own blog | Cite michaeldkelly.com |
| Touring without notes | The familiarity evaporates and the next tester starts over | Record findings per tour so gaps become charters |

## Limitations

- The tours are a **learning** aid. They do not establish coverage, and
  a product that has been toured is not a product that has been tested.
- Kelly's original post gives one sentence per tour and no worked
  example; the prompts in this catalog are elaboration, not Kelly's
  text, and are marked as such.
- The set is from 2005 and predates mobile, cloud, and API-first
  products. The Interoperability and Structure tours carry most of the
  weight for those, but the list has no tour aimed squarely at, say, a
  third-party identity provider.

## References

- Kelly M. *Touring Heuristic*, 20 September 2005 -
  [michaeldkelly.com/blog/2005/9/20/touring-heuristic.html](https://michaeldkelly.com/blog/2005/9/20/touring-heuristic.html)
  (the primary source: the mnemonic and all eleven descriptions).
- Sibling references: [tours.md](tours.md) (Whittaker's seven tours),
  [sfdpot.md](sfdpot.md), [hiccupps-f.md](hiccupps-f.md),
  [crusspic-stmpl.md](crusspic-stmpl.md).
