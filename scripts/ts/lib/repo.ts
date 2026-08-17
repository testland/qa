// Shared walking and frontmatter helpers for the marketplace tooling.
//
// Paths are always returned with forward slashes and sorted on that form, so a
// Windows contributor and the Linux CI runner produce identical output ordering.
// The Python originals sorted os.sep paths, which only agreed by accident.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const slash = (p: string) => p.split('\\').join('/');

/** Codepoint order, matching Python's default string sort. localeCompare would
 *  reorder hyphenated names and silently diverge from the scripts being ported. */
export const byCodepoint = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export function dirNames(p: string): string[] {
  try {
    return readdirSync(p, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return [];
  }
}

export function fileNames(p: string): string[] {
  try {
    return readdirSync(p, { withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => d.name);
  } catch {
    return [];
  }
}

export const exists = (p: string): boolean => {
  try {
    statSync(p);
    return true;
  } catch {
    return false;
  }
};

export interface SkillRef {
  plugin: string;
  skill: string;
  dir: string;
  path: string;
}

export interface AgentRef {
  plugin: string;
  agent: string;
  path: string;
}

export const pluginNames = (root: string): string[] => dirNames(join(root, 'plugins')).sort();

/** Every plugins/<p>/skills/<s>/SKILL.md, sorted by forward-slash path. */
export function skills(root: string): SkillRef[] {
  const out: SkillRef[] = [];
  for (const plugin of pluginNames(root)) {
    const skillsDir = join(root, 'plugins', plugin, 'skills');
    for (const skill of dirNames(skillsDir)) {
      const dir = join(skillsDir, skill);
      if (exists(join(dir, 'SKILL.md'))) {
        out.push({ plugin, skill, dir, path: `plugins/${plugin}/skills/${skill}/SKILL.md` });
      }
    }
  }
  return out.sort((a, b) => byCodepoint(a.path, b.path));
}

/** Every plugins/<p>/agents/*.md, sorted by forward-slash path. */
export function agents(root: string): AgentRef[] {
  const out: AgentRef[] = [];
  for (const plugin of pluginNames(root)) {
    const agentsDir = join(root, 'plugins', plugin, 'agents');
    for (const f of fileNames(agentsDir)) {
      if (!f.endsWith('.md')) continue;
      out.push({ plugin, agent: f.slice(0, -3), path: `plugins/${plugin}/agents/${f}` });
    }
  }
  return out.sort((a, b) => byCodepoint(a.path, b.path));
}

export const read = (p: string): string => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

/** The YAML block between the leading `---` fences, or null when absent. */
export function frontmatter(content: string): string | null {
  const m = /^---\n([\s\S]*?)\n---/.exec(content);
  return m ? m[1]! : null;
}

/** Values of a YAML list field such as `skills:` followed by `  - name` lines. */
export function listField(fm: string, field: string): string[] {
  const m = new RegExp(`^${field}:\\s*\\n((?:\\s+-\\s+.*\\n?)+)`, 'm').exec(fm);
  if (!m) return [];
  return [...m[1]!.matchAll(/^\s+-\s+(.+)$/gm)].map((x) => x[1]!.trim());
}

export interface PluginManifest {
  path: string;
  dir: string;
  plugin: string;
  json: Record<string, unknown>;
}

export function manifests(root: string): PluginManifest[] {
  const out: PluginManifest[] = [];
  for (const plugin of pluginNames(root)) {
    const path = `plugins/${plugin}/.claude-plugin/plugin.json`;
    const abs = join(root, path);
    if (!exists(abs)) continue;
    out.push({
      path,
      dir: `plugins/${plugin}`,
      plugin,
      json: JSON.parse(readFileSync(abs, 'utf8')) as Record<string, unknown>,
    });
  }
  return out.sort((a, b) => byCodepoint(a.path, b.path));
}
