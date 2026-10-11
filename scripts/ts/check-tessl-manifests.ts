#!/usr/bin/env tsx
// Keeps every skill's Tessl manifest in step with its SKILL.md.
//
// The Tessl registry shows `.tessl-plugin/plugin.json` `description` as the
// tile header, so a manifest that drifts from SKILL.md advertises a stale
// description next to the current body. Tessl's `metadata_version` validation
// also warns when a SKILL.md has a `metadata:` block without `version`; this
// requires that value to equal the manifest `version`, the version the tile is
// published at (.github/workflows/tessl-publish.yml).
//
// Usage: tsx scripts/ts/check-tessl-manifests.ts [--fix] [ROOT]
//   --fix copies each SKILL.md description into its manifest and writes the
//   manifest version into metadata.version. Run it after bumping a manifest.
//
// Exit 0 ok · 1 a mismatch remains.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { exists, frontmatter, read, skills } from './lib/repo.ts';
import { scalarField } from './lib/yaml-scalar.ts';

const args = process.argv.slice(2);
const FIX = args.includes('--fix');
const ROOT = args.find((a) => a !== '--fix') ?? '.';

let failures = 0;
let fixed = 0;

const fail = (file: string, reason: string): void => {
  console.log(`FAIL (${file}): ${reason}`);
  failures += 1;
};

interface MetadataBlock {
  /** Index of the line after the block's last entry. */
  end: number;
  indent: string;
  /** Line index and raw value of `version:`, when present. */
  version: { line: number; value: string } | null;
}

/** The top-level `metadata:` mapping, read line by line like the rest of the
 *  tooling. Its values are flat strings (keywords, version). */
function metadataBlock(lines: string[]): MetadataBlock | null {
  const start = lines.findIndex((l) => /^metadata:\s*$/.test(l));
  if (start === -1) return null;
  let end = start + 1;
  let indent = '  ';
  let version: MetadataBlock['version'] = null;
  for (; end < lines.length; end++) {
    const m = /^(\s+)([\w.-]+):\s*(.*?)\s*$/.exec(lines[end]!);
    if (!m) break;
    if (end === start + 1) indent = m[1]!;
    if (m[2] === 'version') version = { line: end, value: m[3]!.replace(/^(["'])(.*)\1$/, '$2') };
  }
  return { end, indent, version };
}

for (const s of skills(ROOT)) {
  const skillPath = join(ROOT, s.path);
  const manifestRel = `plugins/${s.plugin}/skills/${s.skill}/.tessl-plugin/plugin.json`;
  const manifestPath = join(ROOT, manifestRel);

  if (!exists(manifestPath)) {
    fail(manifestRel, 'missing; every skill is published to Tessl from this manifest');
    continue;
  }
  let manifest: Record<string, unknown>;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
  } catch {
    fail(manifestRel, 'invalid JSON syntax');
    continue;
  }

  const content = read(skillPath);
  const fm = frontmatter(content);
  if (fm === null) {
    fail(s.path, 'missing YAML frontmatter');
    continue;
  }

  if (manifest['name'] !== `testland/${s.skill}`) {
    fail(manifestRel, `name is ${JSON.stringify(manifest['name'])}, expected "testland/${s.skill}"`);
  }
  const version = typeof manifest['version'] === 'string' ? manifest['version'] : '';
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    fail(manifestRel, `version ${JSON.stringify(manifest['version'])} is not x.y.z`);
    continue;
  }

  let description: string | null;
  try {
    description = scalarField(fm, 'description');
  } catch (e) {
    fail(s.path, `description: ${(e as Error).message}`);
    continue;
  }
  if (!description) {
    fail(s.path, 'empty description');
    continue;
  }

  if (manifest['description'] !== description) {
    if (FIX) {
      manifest['description'] = description;
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
      fixed += 1;
    } else {
      fail(manifestRel, 'description differs from SKILL.md; the Tessl tile header shows this copy');
    }
  }

  const lines = content.split('\n');
  const fmEnd = fm.split('\n').length + 1; // index of the closing `---`
  const block = metadataBlock(lines.slice(0, fmEnd));
  if (!block || block.version?.value === version) continue;
  if (!FIX) {
    fail(
      s.path,
      block.version
        ? `metadata.version is ${block.version.value}, manifest version is ${version}`
        : `metadata block has no version; add \`version: "${version}"\` (Tessl metadata_version check)`,
    );
    continue;
  }
  const entry = `${block.indent}version: "${version}"`;
  if (block.version) lines[block.version.line] = entry;
  else lines.splice(block.end, 0, entry);
  // Keep a Windows checkout's CRLF; `read` normalised it away.
  const eol = readFileSync(skillPath, 'utf8').includes('\r\n') ? '\r\n' : '\n';
  writeFileSync(skillPath, lines.join(eol));
  fixed += 1;
}

if (fixed) console.log(`tessl-manifests: fixed ${fixed} file(s)`);
if (failures) {
  console.log(`tessl-manifests: ${failures} problem(s); run with --fix to resync descriptions and metadata.version`);
  process.exit(1);
}
console.log('tessl-manifests: every manifest matches its SKILL.md');
