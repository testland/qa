#!/usr/bin/env tsx
// Scaffolds a new plugin from templates/plugin/ and appends it to
// .claude-plugin/marketplace.json plugins[].
// Port of scripts/new-plugin.sh (which shelled out to Python for the JSON edits).
//
// Usage: npm run new-plugin -- <plugin-name> "<description>" <primary-keyword>

import { cpSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { exists } from './lib/repo.ts';

const ROOT = process.cwd();
const [name, desc, kw] = process.argv.slice(2);

const die = (msg: string): never => {
  console.error(msg);
  process.exit(1);
};

if (!name || !desc || !kw) {
  die('Usage: new-plugin <plugin-name> "<description>" <primary-keyword>');
}
if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(name!) || name!.includes('--')) {
  die(`ERROR: name '${name}' must be kebab-case`);
}
if (/anthropic|claude/.test(name!)) {
  die(`ERROR: name '${name}' contains reserved word (anthropic/claude)`);
}

const target = join(ROOT, 'plugins', name!);
const template = join(ROOT, 'templates', 'plugin');
const marketplacePath = join(ROOT, '.claude-plugin', 'marketplace.json');

if (exists(target)) die(`ERROR: ${target} already exists`);
if (!exists(template)) die(`ERROR: template not found at ${template}`);

interface Marketplace {
  plugins?: { name?: string; source?: string; description?: string; strict?: boolean }[];
  [k: string]: unknown;
}
const marketplace = JSON.parse(readFileSync(marketplacePath, 'utf8')) as Marketplace;
marketplace.plugins ??= [];
if (marketplace.plugins.some((p) => p.name === name)) {
  die(`ERROR: '${name}' already present in marketplace.json plugins[]`);
}

cpSync(template, target, { recursive: true });

for (const rel of ['.claude-plugin/plugin.json', 'README.md']) {
  const p = join(target, ...rel.split('/'));
  const text = readFileSync(p, 'utf8')
    .split('PLUGIN_NAME_KEBAB').join(name!)
    .split('ONE_LINE_DESCRIPTION_HERE').join(desc!)
    .split('PRIMARY_KEYWORD').join(kw!);
  writeFileSync(p, text);
}

marketplace.plugins.push({ name: name!, source: `./plugins/${name}`, description: desc!, strict: true });
writeFileSync(marketplacePath, JSON.stringify(marketplace, null, 2) + '\n');

console.log(`Scaffolded plugins/${name}`);
console.log('Next steps:');
console.log(`  1. Add components under plugins/${name}/agents/ or plugins/${name}/skills/`);
console.log('  2. Run: npm run validate');
console.log('  3. When all components land, bump plugin.json version 0.1.0 -> 1.0.0');
