# .zap

`context.xml` is exported from the desktop tool and committed. Regenerate it
there rather than hand-editing if you can; hand edits are fine for the URL
patterns.

The `/admin/purge` exclusion is deliberate and must stay. That endpoint
permanently deletes tenant data and has no confirmation step on the GET — it is
on the list to fix and until then no crawler goes near it.
