#!/usr/bin/env tsx
// Generates CATALOG.md from .claude-plugin/marketplace.json + per-plugin manifests.
// Port of scripts/generate-catalog.py; output is byte-identical.
//
// Plugins with no recognised `category` fall under "Uncategorized" and the
// script exits 1, so CI catches an unfiled plugin.
//
// `--stdout` prints the markdown instead of writing it - used by parity-check.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { byCodepoint, dirNames, exists, fileNames } from './lib/repo.ts';

const ROOT = process.cwd();
const MARKETPLACE = join(ROOT, '.claude-plugin', 'marketplace.json');
const CATALOG = join(ROOT, 'CATALOG.md');
const TO_STDOUT = process.argv.includes('--stdout');

const CATEGORY_ORDER: [string, string, string][] = [
  ['foundations', 'Foundations', 'Test process and strategy, test data, environments, reporting, impact analysis, test review, test management and QA team management.'],
  ['functional-testing', 'Functional testing', 'API, contract, BDD, web E2E, mobile, desktop, embedded and game testing, mutation and property-based testing, and unit tests per language.'],
  ['quality-engineering', 'Quality engineering', 'Accessibility, visual regression, data quality, localization, PDF and print output, browser extensions and progressive web apps.'],
  ['security-compliance', 'Security & compliance', 'SAST, DAST, SCA, secrets and SBOM scanning, infrastructure as code, fuzzing, compliance, test-data privacy and multi-tenant isolation.'],
  ['operations-resilience', 'Operations & resilience', 'Flaky-test triage, bug reproduction, defect management, load testing, resilience drills, and shift-left and shift-right checks.'],
  ['backend-distributed', 'Backend & distributed systems', 'DB migrations, async jobs, caching, concurrency, distributed tracing, saga and CQRS, serverless, and time and timezones.'],
  ['integrations-protocols', 'Integrations & protocols', 'GraphQL, gRPC, real-time protocols, auth flows, notifications, payments, feature flags and A/B experiments.'],
  ['ai-ml', 'AI & ML', 'LLM evaluation, ML model testing, AI-assisted test generation and review, and search relevance.'],
  ['tooling', 'Tooling', 'CI integration, CLI tool testing, code-quality gates and manual testing.'],
  ['role-bundles', 'Role bundles', 'One-command role installs: each bundle pulls in the plugins one QA role needs, from qa-starter essentials to leadership.'],
];
const CATEGORY_KEYS = CATEGORY_ORDER.map(([k]) => k);

interface Row {
  name: string;
  version: string;
  skillCount: number;
  agentCount: number;
}

function countComponents(pluginDir: string): { skills: number; agents: number } {
  const skills = dirNames(join(pluginDir, 'skills')).filter((s) =>
    exists(join(pluginDir, 'skills', s, 'SKILL.md')),
  ).length;
  const agents = fileNames(join(pluginDir, 'agents')).filter((f) => f.endsWith('.md')).length;
  return { skills, agents };
}

function main(): void {
  if (!exists(MARKETPLACE)) {
    console.error(`error: ${MARKETPLACE} not found`);
    process.exit(1);
  }
  const marketplace = JSON.parse(readFileSync(MARKETPLACE, 'utf8')) as {
    plugins?: { name?: string; category?: string; description?: string }[];
  };
  const plugins = marketplace.plugins ?? [];

  const byCategory = new Map<string, Row[]>();
  const uncategorized: string[] = [];

  for (const entry of plugins) {
    const name = entry.name ?? '?';
    let category = entry.category ?? '';
    if (!CATEGORY_KEYS.includes(category)) {
      uncategorized.push(name);
      category = 'uncategorized';
    }
    const pluginDir = join(ROOT, 'plugins', name);
    const manifest = join(pluginDir, '.claude-plugin', 'plugin.json');
    let version = '?';
    if (exists(manifest)) {
      version = ((JSON.parse(readFileSync(manifest, 'utf8')) as { version?: string }).version) ?? '?';
    }
    const c = countComponents(pluginDir);
    const list = byCategory.get(category) ?? [];
    list.push({ name, version, skillCount: c.skills, agentCount: c.agents });
    byCategory.set(category, list);
  }

  const lines: string[] = [];
  lines.push('# Catalog');
  lines.push('');
  lines.push('Auto-generated from `.claude-plugin/marketplace.json` and per-plugin manifests.');
  lines.push('Do not edit by hand - run `make catalog` (or `npm run catalog`).');
  lines.push('');

  const totalPlugins = plugins.length;
  let totalComponents = 0;
  for (const list of byCategory.values()) {
    for (const p of list) totalComponents += p.skillCount + p.agentCount;
  }
  lines.push(`**${totalPlugins} plugins · ${totalComponents} components**`);
  lines.push('');
  lines.push(
    'Within each category, plugins are sorted by **Total** (skills + agents); ' +
      'larger plugins cover more of an area.',
  );
  lines.push('');

  for (const [key, label, sub] of CATEGORY_ORDER) {
    const bucket = [...(byCategory.get(key) ?? [])].sort((a, b) => {
      const ta = a.skillCount + a.agentCount;
      const tb = b.skillCount + b.agentCount;
      return tb - ta || byCodepoint(a.name, b.name);
    });
    if (bucket.length === 0) continue;
    lines.push(`## ${label}`);
    lines.push('');
    lines.push(`_${sub}_`);
    lines.push('');
    lines.push('| Plugin | Version | Components | Total |');
    lines.push('|---|---|---|---:|');
    for (const p of bucket) {
      const total = p.skillCount + p.agentCount;
      lines.push(
        `| [${p.name}](plugins/${p.name}/) | ${p.version} | ` +
          `${p.skillCount} skills + ${p.agentCount} agents | ${total} |`,
      );
    }
    lines.push('');
  }

  if (uncategorized.length) {
    lines.push('## Uncategorized');
    lines.push('');
    lines.push('These plugins are missing the `category` field in `marketplace.json`.');
    lines.push('Add one of: ' + CATEGORY_KEYS.map((k) => `\`${k}\``).join(', '));
    lines.push('');
    for (const n of [...uncategorized].sort()) lines.push(`- [${n}](plugins/${n}/)`);
    lines.push('');
  }

  lines.push('## Alphabetical index');
  lines.push('');
  const allNames: string[] = [];
  for (const list of byCategory.values()) allNames.push(...list.map((p) => p.name));
  for (const n of [...new Set(allNames)].sort()) lines.push(`- [${n}](plugins/${n}/)`);
  lines.push('');

  const markdown = lines.join('\n');
  if (TO_STDOUT) {
    process.stdout.write(markdown);
    return;
  }
  writeFileSync(CATALOG, markdown);
  console.log(`wrote ${CATALOG} (${totalPlugins} plugins, ${totalComponents} components)`);

  if (uncategorized.length) {
    console.error(
      `error: ${uncategorized.length} plugin(s) missing category: ${uncategorized.join(', ')}`,
    );
    process.exit(1);
  }
}

main();
