---
name: New plugin or component request
about: Propose a new plugin, skill, or agent
title: "[request] short summary"
labels: ["enhancement", "needs-triage"]
---

## What you want

<!-- One paragraph: what testing discipline / tool / workflow this would cover. -->

## Plugin or component?

- [ ] New plugin
- [ ] New skill in an existing plugin (which: ____________)
- [ ] New agent in an existing plugin (which: ____________)

## Archetype (best guess)

- [ ] Skill — S1 file-format/domain wrapper / S2 pure reference / S3 build-an-X / S4 toolkit dispatcher
- [ ] Agent — A1 read-only specialist / A2 action-taking task / A3 adversarial critic / A4 builder/scaffolder

See [`docs/PLUGIN_AUTHORING.md`](../docs/PLUGIN_AUTHORING.md) for archetype definitions.

## Why is the current marketplace insufficient?

<!-- Cite the closest existing components and explain the differentiation. If there is no near-clone, say so. -->

## NOT-GAPS check

- [ ] This is not a generic role agent (`qa-expert`, `quality-engineer`, etc.)
- [ ] This is not a multi-tool mega-bundle ("does everything for X")
- [ ] This is not a near-clone of an existing component without a documented differentiation axis

See [`docs/CONTRIBUTING.md`](../docs/CONTRIBUTING.md) for the full NOT-GAPS list.

## Canonical sources

<!-- Authoritative URLs that an author would cite while writing this component
     (vendor docs, RFCs, ISTQB glossary, etc.). The d6 ≥ 1 floor requires
     every concrete claim be backed by one of these. -->
