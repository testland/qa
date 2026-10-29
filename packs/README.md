# Directory packs

The plugins in this repo are also published as 11 non-overlapping packs in
[testland/qa-skills](https://github.com/testland/qa-skills), the repo the
Claude plugin directory reads. That repo is generated: nobody edits it by hand.

| File | What it is |
| --- | --- |
| `packs.json` | The pack map: each pack's name, description, keywords, three example prompts and source plugins, plus the role recipes. Moving a plugin is a one-line change here. |
| `packs.lock.json` | Each pack's version, content hash and skill and agent list. Written by `make packs`; commit it. |
| `icon.png` | The listing icon copied into every pack. The directory keeps the icon from a plugin's first submission, so change it only before then. |

## Build

```bash
make packs          # writes build/packs/ (gitignored) and updates packs.lock.json
npm run packs:check # what CI runs: fails if the map or the lock is stale
```

Each pack copies its plugins' skill folders (without `evals/` and
`.tessl-plugin/`) and `agents/*.md`, rewrites relative links for the pack layout
(same pack: relative path; another pack: the testland.io page; outside
`plugins/`: the file on GitHub), and generates `plugin.json`, a README and the
root `marketplace.json`.

A pack's version moves only when its files change: minor when a skill or agent
is added or removed, patch for any other change. Unchanged packs keep their
version, so they don't start a new directory review.

## Rules

- Every plugin that owns skills or agents is in exactly one pack. A new plugin
  fails `packs:check` until it is added to `packs.json`.
- Skill and agent names are unique inside a pack.
- A pack stays under 512 files.

## Load test

`packs/evals/<pack>/<case>/` holds trigger cases for `claude plugin eval`:
each prompt names a task, and its grader passes when Claude loads the expected
skill with the whole pack installed. They catch two failures that per-skill
evals miss: a description that doesn't lead with its trigger, and a pack whose
skill listing is over Claude Code's
[listing budget](https://code.claude.com/docs/en/skills.md), which drops
descriptions so Claude sees only the skill name.

```bash
scripts/packs-eval.sh testland-api 3   # builds the packs, runs each case 3 times
```

Write prompts that stand alone: the run starts in an empty directory, so a
prompt about "our repository" makes Claude look for code instead of a skill.

## Publishing

`.github/workflows/packs-sync.yml` runs on a published release (or by hand). It
rebuilds the packs and replaces the content of testland/qa-skills in one commit
named after the source commit. It needs the `QA_SKILLS_TOKEN` secret: a
fine-grained token with Contents read and write on testland/qa-skills only.
