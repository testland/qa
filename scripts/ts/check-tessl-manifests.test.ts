// Fixture harness for check-tessl-manifests: plants one skill per failure mode,
// asserts each is named in the output, then runs --fix and asserts only the
// problems --fix cannot repair remain.

import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let root: string;

const write = (rel: string, content: string): void => {
  const abs = join(root, rel);
  mkdirSync(join(abs, '..'), { recursive: true });
  writeFileSync(abs, content);
};

const skill = (name: string, frontmatter: string, manifest: Record<string, unknown> | null): void => {
  const dir = `plugins/test-plugin/skills/${name}`;
  write(`${dir}/SKILL.md`, `---\nname: ${name}\n${frontmatter}\n---\n\n# ${name}\n\nBody.\n`);
  if (manifest) write(`${dir}/.tessl-plugin/plugin.json`, `${JSON.stringify(manifest, null, 2)}\n`);
};

const tile = (name: string, description: string, version = '1.0.0') => ({
  name: `testland/${name}`,
  description,
  private: false,
  skills: ['.'],
  version,
});

const run = (...args: string[]) => {
  const r = spawnSync('npx', ['tsx', 'scripts/ts/check-tessl-manifests.ts', ...args, root], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  return { output: `${r.stdout ?? ''}${r.stderr ?? ''}`, status: r.status };
};

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'tlqa-tessl-'));
  skill('in-sync', 'description: "Matches its manifest."\nmetadata:\n  keywords: "a, b"\n  version: "1.0.0"', tile('in-sync', 'Matches its manifest.'));
  skill(
    'folded-desc',
    'description: "Spans\n  two lines with a \\"quote\\"."',
    tile('folded-desc', 'Spans two lines with a "quote".'),
  );
  skill('stale-desc', 'description: "New wording."', tile('stale-desc', 'Old wording.'));
  skill('no-meta-version', 'description: "D."\nmetadata:\n  keywords: "x"', tile('no-meta-version', 'D.', '2.3.4'));
  skill('old-meta-version', "description: \"D.\"\nmetadata:\n  version: '1.0.0'", tile('old-meta-version', 'D.', '1.0.1'));
  skill('wrong-name', 'description: "D."', { ...tile('wrong-name', 'D.'), name: 'testland/other' });
  skill('no-manifest', 'description: "D."', null);
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('check-tessl-manifests', () => {
  it('flags every planted mismatch and nothing else', () => {
    const { output, status } = run();
    expect(status).toBe(1);
    const failed = output
      .split('\n')
      .filter((l) => l.startsWith('FAIL'))
      .map((l) => /skills\/([^/]+)\//.exec(l)?.[1]);
    expect(failed.sort()).toEqual(['no-manifest', 'no-meta-version', 'old-meta-version', 'stale-desc', 'wrong-name']);
  });

  it('--fix repairs descriptions and metadata.version, leaving the rest', () => {
    run('--fix');
    const { output, status } = run();
    expect(status).toBe(1);
    expect(output).toContain('no-manifest');
    expect(output).toContain('wrong-name');
    expect(output).not.toContain('stale-desc');
    expect(output).not.toContain('meta-version');

    const manifest = JSON.parse(
      readFileSync(join(root, 'plugins/test-plugin/skills/stale-desc/.tessl-plugin/plugin.json'), 'utf8'),
    ) as { description: string };
    expect(manifest.description).toBe('New wording.');
    const md = readFileSync(join(root, 'plugins/test-plugin/skills/no-meta-version/SKILL.md'), 'utf8');
    expect(md).toContain('metadata:\n  keywords: "x"\n  version: "2.3.4"\n---');
    const replaced = readFileSync(join(root, 'plugins/test-plugin/skills/old-meta-version/SKILL.md'), 'utf8');
    expect(replaced).toContain('  version: "1.0.1"');
  });
});
