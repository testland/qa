#!/usr/bin/env tsx
// Mechanical content checks. Lint guardrails, NOT the quality rubric - the
// six-dimension D1-D6 review is applied by a human reading the diff.
// Port of scripts/content-audit.py; output is byte-identical.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { agents, byCodepoint, exists, pluginNames, skills } from './lib/repo.ts';

const ROOT = process.cwd();
const STRICT = process.argv.includes('--strict');

// Anthropic publishes only "keep SKILL.md under 500 lines"; agents have no
// published cap since they run in their own context. The hard caps below are
// generous ceilings meaning "something is structurally wrong if exceeded".
const SKILL_BODY_HARDCAP = 600;
const AGENT_BODY_HARDCAP = 350;
const SKILL_BODY_ADVISORY = 500;

// Components where a literal Windows path is the vendor-canonical install
// location for a Windows-only tool, not a hygiene oversight. Reviewed 2026-05-27.
const WINDOWS_PATH_ALLOWLIST = new Set([
  'plugins/qa-desktop/skills/appium-windows-driver/SKILL.md',
  'plugins/qa-desktop/skills/winappdriver/SKILL.md',
  'plugins/qa-game/skills/unity-test-framework/SKILL.md',
  'plugins/qa-desktop/skills/desktop-test-strategy-reference/SKILL.md',
]);

type Finding = Record<string, string | number>;

function parseFrontmatter(path: string): [{ desc: string } | null, string] {
  let c: string;
  try {
    c = readFileSync(join(ROOT, path), 'utf8').replace(/\r\n/g, '\n');
  } catch {
    return [null, ''];
  }
  if (!c.startsWith('---')) return [null, c];
  // Python's split("---", 2): parts[1] is the frontmatter, parts[2] the body.
  const i2 = c.indexOf('---', 3);
  if (i2 === -1) return [null, c];
  const fmText = c.slice(3, i2);
  const body = c.slice(i2 + 3);

  const m = /description:\s*"([\s\S]*?)"\s*\n[a-z_-]+:/.exec(fmText);
  const desc = m ? m[1]! : (/^description:\s*"?(.*?)"?\s*$/m.exec(fmText)?.[1] ?? '');
  return [{ desc }, body];
}

const components = [
  ...skills(ROOT).map((s) => s.path),
  ...agents(ROOT).map((a) => a.path),
].sort(byCodepoint);

const findings = new Map<string, Finding[]>();
const add = (key: string, f: Finding): void => {
  const list = findings.get(key) ?? [];
  list.push(f);
  findings.set(key, list);
};

const WIN_DRIVE = /`[^`\n]*[A-Z]:\\[A-Za-z]/;
const WIN_MULTI = /`[^`\n]*\\[A-Z][A-Za-z0-9_. -]*\\[A-Z]/;
const LINK_DRIVE = /\]\([^)]*[A-Z]:\\[A-Za-z]/;
const LINK_MULTI = /\]\([^)]*\\[A-Z][A-Za-z0-9_. -]*\\[A-Z]/;

let total = 0;
for (const p of components) {
  total += 1;
  const [fm, body] = parseFrontmatter(p);
  if (fm === null) {
    add('unparseable_frontmatter', { path: p });
    continue;
  }
  const isAgent = p.includes('/agents/');
  const descLen = fm.desc.length;
  const bodyLines = (body.match(/\n/g) ?? []).length;

  if (descLen > 1024) add('desc_too_long', { path: p, desc_len: descLen });

  const cap = isAgent ? AGENT_BODY_HARDCAP : SKILL_BODY_HARDCAP;
  if (bodyLines > cap) add('body_too_long', { path: p, body_lines: bodyLines, cap });

  if (WIN_DRIVE.test(body) || WIN_MULTI.test(body) || LINK_DRIVE.test(body) || LINK_MULTI.test(body)) {
    if (!WINDOWS_PATH_ALLOWLIST.has(p)) add('windows_path', { path: p });
  }

  if (!isAgent && bodyLines > SKILL_BODY_ADVISORY) {
    add('skill_body_over_500', { path: p, body_lines: bodyLines });
  }
}

// Every plugin README lists its components in a markdown table. That row count
// must equal SKILL.md + agent .md on disk, or the README misleads browsers.
// Rows are counted by the component link they carry rather than the first-cell
// label, so org-chart tables (`| Role | Agent | task |`) count too.
const LINK_RE = /\]\((?:agents\/[^)]+\.md|skills\/[^)]+\/SKILL\.md)\)/;
const allSkills = skills(ROOT);
const allAgents = agents(ROOT);

// Every plugin carrying a README, including role bundles that own no components
// and must therefore show zero component rows.
const pluginsWithReadme = pluginNames(ROOT).filter((p) =>
  exists(join(ROOT, 'plugins', p, 'README.md')),
);

for (const plugin of pluginsWithReadme.sort(byCodepoint)) {
  const readme = `plugins/${plugin}/README.md`;
  const disk =
    allSkills.filter((s) => s.plugin === plugin).length +
    allAgents.filter((a) => a.plugin === plugin).length;
  let rows = 0;
  for (const line of readFileSync(join(ROOT, readme), 'utf8').replace(/\r\n/g, '\n').split('\n')) {
    if (!line.trimStart().startsWith('|')) continue;
    if (line.includes('](../')) continue; // cross-plugin reference row
    const cells = line.split('|').map((c) => c.trim());
    const first = cells.length > 1 ? cells[1]!.toLowerCase() : '';
    if (first === 'skill' || first === 'agent' || LINK_RE.test(line)) rows += 1;
  }
  if (rows !== disk) add('readme_count_mismatch', { path: readme, readme_rows: rows, disk });
}

console.log('# Content audit\n');
console.log(`**Components scanned:** ${total}  `);
console.log(`**Mode:** ${STRICT ? 'strict (fail on critical)' : 'advisory'}\n`);

const SEVERITY: [string, 'CRITICAL' | 'WARNING'][] = [
  ['desc_too_long', 'CRITICAL'],
  ['body_too_long', 'CRITICAL'],
  ['unparseable_frontmatter', 'CRITICAL'],
  ['readme_count_mismatch', 'CRITICAL'],
  ['windows_path', 'WARNING'],
  ['skill_body_over_500', 'WARNING'],
];

let critical = 0;
for (const [key, sev] of SEVERITY) {
  const items = findings.get(key) ?? [];
  console.log(`### [${sev}] ${key} — ${items.length}`);
  for (const it of items.slice(0, 30)) {
    const extra = Object.entries(it)
      .filter(([k]) => k !== 'path')
      .map(([k, v]) => ` (${k}=${v})`)
      .join('');
    console.log(`- \`${it['path']}\`${extra}`);
  }
  console.log('');
  if (sev === 'CRITICAL') critical += items.length;
}

if (STRICT && critical) {
  console.log(`[content-audit] ${critical} critical finding(s); exiting 1`);
  process.exit(1);
}
console.log(`[content-audit] ${critical === 0 ? 'no critical findings' : `${critical} critical (advisory)`}`);
