import { describe, expect, it } from 'vitest';
import { checkMap, nextVersion, rewriteLinks, rewriteTarget, sitePage, type PackMap } from './build-packs.ts';

const where = new Map([
  ['plugins/qa-a/skills/one/SKILL.md', { pack: 'p1', dest: 'skills/one/SKILL.md' }],
  ['plugins/qa-a/skills/one/references/x.md', { pack: 'p1', dest: 'skills/one/references/x.md' }],
  ['plugins/qa-b/agents/critic.md', { pack: 'p1', dest: 'agents/critic.md' }],
  ['plugins/qa-c/skills/two/SKILL.md', { pack: 'p2', dest: 'skills/two/SKILL.md' }],
]);
const SRC = 'https://github.com/testland/qa';
const rw = (t: string, src = 'plugins/qa-a/skills/one/SKILL.md', dest = 'skills/one/SKILL.md', exists = () => false) =>
  rewriteTarget(t, src, dest, 'p1', where, SRC, exists);

describe('rewriteTarget', () => {
  it('keeps links inside the same skill', () => {
    expect(rw('references/x.md#step-2')).toBe('references/x.md#step-2');
  });
  it('re-points a cross-plugin link to its place in the same pack', () => {
    expect(rw('../../../qa-b/agents/critic.md')).toBe('../../agents/critic.md');
  });
  it('sends a link into another pack to its testland.io page', () => {
    expect(rw('../../../qa-c/skills/two/SKILL.md')).toBe('https://testland.io/plugins/qa-c/skills/two');
  });
  it('sends a link to a file outside plugins/ to GitHub when it exists', () => {
    expect(rw('../../../../docs/ROADMAP.md', undefined, undefined, () => true)).toBe(`${SRC}/blob/main/docs/ROADMAP.md`);
  });
  it('leaves absolute URLs, anchors and already-broken links alone', () => {
    expect(rw('https://example.com/a.md')).toBe('https://example.com/a.md');
    expect(rw('#usage')).toBe('#usage');
    expect(rw('../../../../docs/missing.md')).toBe('../../../../docs/missing.md');
  });
});

describe('sitePage', () => {
  it('maps skills, agents and plugins', () => {
    expect(sitePage('plugins/qa-x/skills/s/references/r.md')).toBe('https://testland.io/plugins/qa-x/skills/s');
    expect(sitePage('plugins/qa-x/agents/a.md')).toBe('https://testland.io/plugins/qa-x/agents/a');
    expect(sitePage('plugins/qa-x/README.md')).toBe('https://testland.io/plugins/qa-x');
  });
});

describe('rewriteLinks', () => {
  it('rewrites inline links and reference definitions but not code fences', () => {
    const text = ['[a](x.md) and [b](y.md "title")', '[ref]: z.md', '```', '[c](x.md)', '```'].join('\n');
    const out = rewriteLinks(text, (t) => `new/${t}`);
    expect(out.split('\n')).toEqual(['[a](new/x.md) and [b](new/y.md "title")', '[ref]: new/z.md', '```', '[c](x.md)', '```']);
  });
});

describe('checkMap', () => {
  const map: PackMap = {
    repository: '',
    sourceRepository: '',
    homepage: '',
    packs: [
      { name: 'p1', displayName: 'P1', description: '', keywords: [], examplePrompts: ['a', 'b', 'c'], plugins: ['qa-a', 'qa-b'] },
      { name: 'p2', displayName: 'P2', description: '', keywords: [], examplePrompts: ['a', 'b', 'c'], plugins: ['qa-b'] },
    ],
    recipes: [{ role: 'R', packs: ['p1', 'p3'] }],
  };
  it('flags duplicates, missing plugins and unknown recipe packs', () => {
    const problems = checkMap(map, ['qa-a', 'qa-b', 'qa-c']);
    expect(problems).toContain('plugin qa-b is in both p1 and p2');
    expect(problems).toContain('plugin qa-c is in no pack; add it to packs/packs.json');
    expect(problems).toContain('recipe R names unknown pack p3');
  });
});

describe('nextVersion', () => {
  const prev = { version: '1.2.3', hash: 'h', skills: ['a'], agents: [] };
  it('starts new packs at 1.0.0 and keeps unchanged ones', () => {
    expect(nextVersion(undefined, 'h', ['a'], [])).toBe('1.0.0');
    expect(nextVersion(prev, 'h', ['a'], [])).toBe('1.2.3');
  });
  it('bumps patch for edits and minor for added or removed components', () => {
    expect(nextVersion(prev, 'h2', ['a'], [])).toBe('1.2.4');
    expect(nextVersion(prev, 'h2', ['a', 'b'], [])).toBe('1.3.0');
  });
});
