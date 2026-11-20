#!/usr/bin/env tsx
// Builds the agent -> skill preload graph and validates cross-plugin deps.
// With --write it also regenerates docs/COMPOSITION.md; --check fails when that
// file is stale.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { agents, exists, frontmatter, listField, read, skills } from './lib/repo.ts';

const ROOT = process.cwd();

const skillToPlugin = new Map<string, string>();
for (const s of skills(ROOT)) skillToPlugin.set(s.skill, s.plugin);

const issues: string[] = [];
const agentData: { plugin: string; agent: string; preloads: string[] }[] = [];

for (const a of agents(ROOT)) {
  const fm = frontmatter(read(a.path));
  if (fm === null) continue;
  const preloads = listField(fm, 'skills');
  agentData.push({ plugin: a.plugin, agent: a.agent, preloads });
  for (const s of preloads) {
    if (!skillToPlugin.has(s)) {
      issues.push(`MISSING: ${a.plugin}/${a.agent} preloads \`${s}\` which does not exist`);
    }
  }
}

console.log('=== Composition graph validation ===');
if (issues.length === 0) console.log('All preloaded skills resolve to a plugin.');
else for (const i of issues) console.log(i);

console.log('');
console.log('=== Cross-plugin preloads ===');
const cross: [string, string, string, string][] = [];
for (const { plugin, agent, preloads } of agentData) {
  for (const s of preloads) {
    const owner = skillToPlugin.get(s);
    if (owner && owner !== plugin) cross.push([plugin, agent, owner, s]);
  }
}
if (cross.length === 0) console.log('None.');
for (const [p, a, sp, s] of cross) console.log(`${p}/${a} -> ${sp}/${s}`);

console.log('');
console.log('=== Stats ===');
const withPreloads = agentData.filter((a) => a.preloads.length > 0).length;
console.log(`Total agents: ${agentData.length}`);
console.log(`Agents with \`skills:\` preloads: ${withPreloads}`);
console.log(`Agents without preloads: ${agentData.length - withPreloads}`);
console.log(`Total skills: ${skillToPlugin.size}`);
console.log(`Cross-plugin preload edges: ${cross.length}`);

// --write regenerates docs/COMPOSITION.md from the graph above; --check exits 1
// when the committed file differs. `npm run catalog` runs --write.
const WRITE = process.argv.includes('--write');
const CHECK_DOC = process.argv.includes('--check');
if (WRITE || CHECK_DOC) {
  const docPath = join(ROOT, 'docs', 'COMPOSITION.md');
  const doc = renderDoc();
  const current = exists(docPath) ? read(docPath) : '';
  if (CHECK_DOC && current !== doc) {
    console.error('docs/COMPOSITION.md is stale: run `npm run catalog` and commit the result.');
    process.exit(1);
  }
  if (WRITE && current !== doc) {
    writeFileSync(docPath, doc);
    console.log('wrote docs/COMPOSITION.md');
  }
}

process.exit(issues.length > 0 ? 1 : 0);

/** Why each cross-plugin preload exists, keyed `consumer-plugin/agent>producer-plugin`. */
function edgeWhy(): Record<string, string> {
  return {
    'qa-ai-assisted/ai-test-curator>qa-test-review':
      'AI-generated tests are reviewed against the same hygiene catalog as human-authored ones.',
    'qa-ai-assisted/ai-test-shallow-coverage-critic>qa-test-review':
      'Shallow-coverage critic uses the same hygiene catalog as test-code-critic.',
    'qa-api-testing/api-test-author>qa-test-data':
      'Multi-input endpoint cases use the parameterized generator.',
    'qa-defect-management/ci-defect-filer>qa-bug-repro':
      'Filing runs the from-CI-failure workflow of the bug report template.',
    'qa-desktop/desktop-test-author>qa-mobile':
      'macOS desktop authoring uses the XCUITest skill (its references/macos.md carries the desktop delta).',
    'qa-desktop/desktop-test-author>qa-unit-tests-net':
      'Desktop tests for .NET stacks compose into the xUnit / NUnit / MSTest umbrella idioms.',
    'qa-flake-triage/regression-bisector>qa-load-testing':
      'Performance bisection uses k6 thresholds or LHCI assertions as the bad-commit signal.',
    'qa-mobile/mobile-test-author>qa-test-data':
      'Mobile parameterized-input scenarios use the language-agnostic generator.',
    'qa-payment/payment-flow-critic>qa-compliance':
      'PAN and CVV findings are graded against the PCI DSS scope rules that skill carries.',
    'qa-process/release-engineer>qa-shift-right':
      'The runbook conductor executes the six-phase runbook shape that skill owns.',
    'qa-realtime-protocols/realtime-protocol-reviewer>qa-notifications':
      'Webhook receiver checks in the review follow the webhook delivery skill.',
    'qa-test-review/framework-architecture-auditor>qa-test-data':
      'Cross-framework audit covers fixture / data-factory patterns documented in qa-test-data.',
    'qa-test-review/test-suite-health-auditor>qa-flake-triage':
      'Per-layer flake-rate axis of the audit references the canonical flake-pattern catalog.',
    'qa-test-review/test-suite-health-auditor>qa-process':
      'Framework-misuse pattern detection consults the framework reference catalog.',
    'qa-web-e2e/automation-harness-bootstrapper>qa-test-review':
      "The scaffolder turns the blueprint's design decisions and the page-object contract into files.",
    'qa-web-e2e/playwright-codegen-reviewer>qa-test-review':
      'Codegen output is reviewed against the same selector / assertion hygiene rules.',
  };
}

function renderDoc(): string {
  const code = (s: string) => `\`${s}\``;
  const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((n * 100) / d));
  const pluginsWithSkills = new Set(skillToPlugin.values()).size;
  const pluginsWithAgents = new Set(agentData.map((a) => a.plugin)).size;

  // Cross-plugin edges grouped by consumer agent and producer plugin.
  const groups = new Map<string, { consumer: string; producer: string; skills: string[] }>();
  for (const [p, a, sp, s] of cross) {
    const key = `${p}/${a}>${sp}`;
    const g = groups.get(key) ?? { consumer: `${p}/${a}`, producer: sp, skills: [] };
    g.skills.push(s);
    groups.set(key, g);
  }
  const why = edgeWhy();
  for (const key of groups.keys()) {
    if (!why[key]) console.error(`warning: no rationale for cross-plugin preload ${key} (add it to edgeWhy())`);
  }

  const out: string[] = [];
  out.push('# Composition graph - agent → skill preloads');
  out.push('');
  out.push("This document maps every agent's `skills:` preload list. It is");
  out.push('generated from the agent files by `scripts/ts/composition-graph.ts`');
  out.push('(`npm run catalog`); do not edit it by hand.');
  out.push('');
  out.push('## Scope');
  out.push('');
  out.push(`- **${skillToPlugin.size} skills** across ${pluginsWithSkills} plugins.`);
  out.push(`- **${agentData.length} agents** across ${pluginsWithAgents} plugins.`);
  out.push(
    `- **${withPreloads} agents** preload one or more skills (~${pct(withPreloads, agentData.length)}%).`,
  );
  out.push(`- **${agentData.length - withPreloads} agents** carry their own context inline (no preloads).`);
  out.push(
    `- **${cross.length} cross-plugin preload edges** (see §"Cross-plugin preload edges" below).`,
  );
  out.push('');
  out.push('## How preloading works');
  out.push('');
  out.push('A Claude Code agent file may declare:');
  out.push('');
  out.push('```yaml');
  out.push('---');
  out.push('name: my-agent');
  out.push('description: ...');
  out.push('tools: Read, Bash(jq *)');
  out.push('skills:');
  out.push('  - skill-a');
  out.push('  - skill-b');
  out.push('---');
  out.push('```');
  out.push('');
  out.push('When the agent is dispatched, the bodies of `skill-a` and `skill-b`');
  out.push("are loaded into the agent's context before the agent body runs.");
  out.push('This lets agents stay short (~30-60 lines) while reusing reference');
  out.push('material that lives in skills.');
  out.push('');
  out.push('## Per-plugin preload map');
  out.push('');
  out.push('Skills owned by another plugin are marked with that plugin in italics.');
  for (const plugin of [...new Set(agentData.map((a) => a.plugin))].sort()) {
    out.push('');
    out.push(`### ${plugin}`);
    out.push('');
    out.push('| Agent | Preloads |');
    out.push('|---|---|');
    for (const a of agentData.filter((x) => x.plugin === plugin).sort((x, y) => (x.agent < y.agent ? -1 : 1))) {
      const cells = a.preloads.map((s) => {
        const owner = skillToPlugin.get(s);
        return owner && owner !== plugin ? `${code(s)} *(${owner})*` : code(s);
      });
      out.push(`| ${code(a.agent)} | ${cells.length ? cells.join(', ') : '_none: context inline_'} |`);
    }
  }
  out.push('');
  out.push('## Cross-plugin preload edges');
  out.push('');
  out.push(`Most agents preload skills from their own plugin. These ${groups.size} consumer and`);
  out.push(`producer pairs make up the ${cross.length} cross-plugin edges:`);
  out.push('');
  out.push('| Consumer | Producer | Skill | Why |');
  out.push('|---|---|---|---|');
  for (const [key, g] of [...groups.entries()].sort((x, y) => (x[0] < y[0] ? -1 : 1))) {
    out.push(
      `| ${code(g.consumer)} | ${code(g.producer)} | ${g.skills.map(code).join(', ')} | ${why[key] ?? '-'} |`,
    );
  }
  out.push('');
  out.push('When a user installs a consumer plugin (e.g., `qa-process`), they');
  out.push('should also install the producer plugin (`qa-shift-right`) for the');
  out.push('preload to resolve. This is a **soft dependency**: the agent still');
  out.push('runs without the preload, but with degraded context.');
  out.push('');
  out.push('## Validation');
  out.push('');
  out.push('The composition graph is validated by `scripts/ts/composition-graph.ts`:');
  out.push('');
  out.push('```bash');
  out.push('npm run compose');
  out.push('```');
  out.push('');
  out.push('Exit code 0 means every preloaded skill name resolves to a real');
  out.push('SKILL.md somewhere in the marketplace. Exit code 1 surfaces missing');
  out.push('references.');
  out.push('');
  out.push('## Regenerating this document');
  out.push('');
  out.push("After any agent's `skills:` field changes, run `npm run catalog` and");
  out.push('commit this file with the agent change. CI fails while it is out of');
  out.push('date. A new cross-plugin preload also needs a one-line rationale in');
  out.push('`edgeWhy()` in `scripts/ts/composition-graph.ts`.');
  out.push('');
  out.push('## References');
  out.push('');
  out.push('- `docs/PLUGIN_AUTHORING.md` - agent body authoring guide');
  out.push('  (preload semantics).');
  out.push('- `docs/REVIEWER_CHECKLIST.md` - reviewer rubric (preload');
  out.push('  alignment is part of D5 Composability).');
  out.push('');
  return out.join('\n');
}
