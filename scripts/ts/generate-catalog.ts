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
  ['foundations', 'Foundations', 'Test process, environment, data, reporting, impact, roles, review.'],
  ['functional-testing', 'Functional testing', 'API, BDD, E2E, mobile, contract, mutation, property-based, per-language unit tests.'],
  ['quality-engineering', 'Quality engineering', 'Data quality, visual regression, accessibility, localization, charts, PDF/print, modern web.'],
  ['security-compliance', 'Security & compliance', 'SAST, DAST, SCA, secrets, SBOM, compliance.'],
  ['operations-resilience', 'Operations & resilience', 'Flake triage, bug repro, chaos, resilience drills, shift-right/left, load.'],
  ['backend-distributed', 'Backend & distributed systems', 'DB migrations, async jobs, caching, concurrency, distributed tracing, saga/CQRS, serverless, time & timezones.'],
  ['integrations-protocols', 'Integrations & protocols', 'GraphQL, gRPC, real-time protocols, auth flows, notifications, payment, feature flags, experimentation.'],
  ['ai-ml', 'AI & ML', 'LLM evaluation, ML model testing, AI-assisted test generation, data notebooks, search relevance.'],
  ['tooling', 'Tooling', 'IaC, CI integration, CLI tools, code quality, compatibility, manual testing.'],
  ['role-bundles', 'Role bundles', 'One-command role installs - each bundles a curated capability set as dependencies: qa-starter essentials plus frontend, backend, security, performance, mobile/desktop, AI/ML & data, and leadership.'],
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
