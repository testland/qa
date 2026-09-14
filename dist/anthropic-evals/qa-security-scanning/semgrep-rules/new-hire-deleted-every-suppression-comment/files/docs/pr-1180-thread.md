# PR #1180 — review thread

**priya.rao** (staff, owns the pipeline) — Right call deleting them, wrong call
putting any of them back as comments. Comments in source are how we got into
this: nobody can review fourteen things scattered across seven files, and for
eighteen months nobody did. Whatever exceptions we still want, express them in
`.semgrep.yml` under `paths.exclude` — the way we already handle `src/util`.
One file, one owner, shows up in every diff, and a new hire can read the whole
policy in thirty seconds without grepping. Do that and I will approve today.

**t.okonkwo** — Or just fix the 63. It is a day of work and then there is
nothing to argue about.

**p.novak** — For what it is worth, the one in the acme client is the sandbox
key from the 2024 integration work. It has never been a real credential. I
would not hold the PR up over it.

**joel.arrindell** — Happy either way. I would rather not re-add fourteen
comments I cannot explain.
