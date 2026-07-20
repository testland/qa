# qa-code-quality

Production code quality wrappers + a synthesizing critic. Five
skills covering SonarQube (Reliability+Maintainability lens - qa-sast
covers the Security lens), Qlty (formerly Code Climate), Lizard
(cyclomatic complexity, language-agnostic), Madge (JS/TS module
graph + circular deps), and Knip (dead code) - plus a critic
agent (`code-quality-critic`) that dedupes and prioritizes findings
across all five tools.

Scoped to production code only. Test-code hygiene (AAA structure,
assertion quality, mocking anti-patterns) is owned by
`qa-test-review`. Each skill includes the production-only scoping
config (e.g., `sonar.exclusions`, `lizard -x"./tests/*"`, Madge
`excludeRegExp`).

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [sonarqube-maintainability-gate](skills/sonarqube-maintainability-gate/SKILL.md) | SonarQube/SonarCloud Reliability + Maintainability lens; Sonar Way Quality Gate enforcement; PR decoration |
| Skill | [codeclimate-config](skills/codeclimate-config/SKILL.md) | Both legacy `.codeclimate.yml` (Code Climate Velocity / GitHub App) and new `.qlty/qlty.toml` (Qlty CLI) |
| Skill | [lizard-complexity](skills/lizard-complexity/SKILL.md) | Per-function CCN + NLOC + parameter-count thresholds; 30+ languages; CSV/XML/HTML output |
| Skill | [madge-deps](skills/madge-deps/SKILL.md) | JS/TS module-graph analysis; circular-dep detection; orphan/leaf finding; SVG visualization |
| Skill | [knip-dead-code](skills/knip-dead-code/SKILL.md) | Unused files / dependencies / exports / types / enum members; framework plugins (Next.js, Remix, Astro, etc.) |
| Agent | [code-quality-critic](agents/code-quality-critic.md) | Adversarial reviewer that dedupes overlapping findings across all 5 tools; net-new-vs-inherited classification; refuses to ✅ on net debt increase |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-code-quality@testland-qa
```
