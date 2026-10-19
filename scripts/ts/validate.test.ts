// Port of scripts/test-validate.sh. Builds a fixture tree holding one valid and
// several invalid components, runs validate against it, and asserts every
// planted violation is flagged.
//
// The shell original grepped for substrings; that is kept, because the point is
// that the offending file is named in the output, not the exact wording.

import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let root: string;
let output: string;
let status: number | null;

const write = (rel: string, content: string): void => {
  const abs = join(root, rel);
  mkdirSync(join(abs, '..'), { recursive: true });
  writeFileSync(abs, content);
};

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'tlqa-fixtures-'));

  write(
    'plugins/test-plugin/skills/valid-name/SKILL.md',
    `---
name: valid-name
description: Demonstrates kebab-case naming and a third-person, action-oriented description that distinguishes itself from the other fixtures used by the validate harness.
---
# Body
Valid body content.
`,
  );
  write('plugins/test-plugin/.claude-plugin/plugin.json', '{ "name": "test-plugin", "version": "0.1.0" }\n');

  write(
    'plugins/test-plugin/skills/Invalid_Name/SKILL.md',
    `---
name: Invalid_Name
description: Should fail validation due to upper-case letters and underscore.
---
`,
  );
  write(
    'plugins/test-plugin/skills/claude-helper/SKILL.md',
    `---
name: claude-helper
description: Should fail because the name contains the reserved word claude.
---
`,
  );
  write(
    'plugins/test-plugin/agents/persona-agent.md',
    `---
name: persona-agent
description: You are a helpful test assistant that should fail validation.
---
Body.
`,
  );
  write(
    'plugins/test-plugin/commands/empty-cmd.md',
    `---
name: empty-cmd
description: Command with empty body should fail.
---
`,
  );
  write(
    'plugins/test-plugin/skills/has-placeholder/SKILL.md',
    `---
name: has-placeholder
description: A skill that still contains DESCRIPTION_PLACEHOLDER inside its body.
---
DESCRIPTION_PLACEHOLDER
`,
  );
  write(
    'plugins/test-plugin/skills/slug-equals-desc/SKILL.md',
    `---
name: slug-equals-desc
description: slug-equals-desc
---
Body.
`,
  );
  write(
    'plugins/test-plugin/skills/vague-auto-gen/SKILL.md',
    `---
name: vague-auto-gen
description: Use when working with X tasks or workflows.
---
Body.
`,
  );

  // Malformed plugin.json, plus a filler skill so the plugin is non-empty.
  write('plugins/bad-json-plugin/.claude-plugin/plugin.json', '{ "name": "bad-json-plugin", "version": "0.1.0",\n');
  write(
    'plugins/bad-json-plugin/skills/dummy-skill/SKILL.md',
    `---
name: dummy-skill
description: Filler skill so the bad-json-plugin is non-empty during iteration; the plugin.json file itself is malformed.
---
Body.
`,
  );

  // Plugin whose description has drifted from its contents: it claims two
  // skills and an agent but ships one skill, and its marketplace entry
  // carries different text.
  write(
    'plugins/drift-plugin/.claude-plugin/plugin.json',
    JSON.stringify({
      name: 'drift-plugin',
      version: '0.1.0',
      description: 'Drift fixture: 2 skills (real-skill, ghost-skill) and 1 agent (ghost-agent).',
    }),
  );
  write(
    'plugins/drift-plugin/skills/real-skill/SKILL.md',
    `---
name: real-skill
description: Filler skill that exists on disk so the drift-plugin description has one true claim among its stale ones.
---
Body.
`,
  );
  write(
    '.claude-plugin/marketplace.json',
    JSON.stringify({
      name: 'fixture-marketplace',
      plugins: [{ name: 'drift-plugin', source: './plugins/drift-plugin', description: 'Drift fixture: real-skill only.' }],
    }),
  );

  const r = spawnSync('npx', ['tsx', 'scripts/ts/validate.ts', root], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  output = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  status = r.status;
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('validate', () => {
  for (const needle of [
    'Invalid_Name',
    'claude-helper',
    'persona-agent',
    'empty-cmd',
    'has-placeholder',
    'slug-equals-desc',
    'vague-auto-gen',
    'bad-json-plugin',
  ]) {
    it(`flags ${needle}`, () => {
      expect(output).toContain(needle);
    });
  }

  it('flags plugin description drift', () => {
    expect(output).toContain('description claims 2 skills');
    expect(output).toContain("names skill 'ghost-skill'");
    expect(output).toContain("names agent 'ghost-agent'");
    expect(output).toContain('differs from plugins/drift-plugin/.claude-plugin/plugin.json');
    expect(output).not.toContain("names skill 'real-skill'");
  });

  it('exits non-zero when fixtures contain known violations', () => {
    expect(status).not.toBe(0);
  });

  it('does not flag the valid fixture', () => {
    const lines = output.split('\n').filter((l) => l.startsWith('FAIL'));
    expect(lines.some((l) => l.includes('valid-name'))).toBe(false);
  });
});
