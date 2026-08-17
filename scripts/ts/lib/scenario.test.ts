import { describe, expect, it } from 'vitest';
import { parseTask, sectionBody } from './scenario.ts';

const TASK = `# Debounced save is untested

## Problem Description

Some prose about the problem.

## Output Specification

Add a test file \`src/debounce.test.js\` covering the quiet period.

Leave \`src/save.test.js\` alone.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "editor-core"
}

=============== FILE: src/debounce.js ===============
function debounce(fn, wait) {
  return fn;
}

module.exports = { debounce };
`;

describe('parseTask', () => {
  it('stops the prompt at the Input Files heading', () => {
    const { prompt } = parseTask(TASK);
    expect(prompt).toContain('## Output Specification');
    expect(prompt).not.toContain('Input Files');
    expect(prompt).not.toContain('editor-core');
  });

  it('splits every FILE block and keeps a single trailing newline', () => {
    const { fixtures } = parseTask(TASK);
    expect(fixtures.map((f) => f.path)).toEqual(['package.json', 'src/debounce.js']);
    expect(fixtures[0]!.content).toBe('{\n  "name": "editor-core"\n}\n');
    expect(fixtures[1]!.content.endsWith('module.exports = { debounce };\n')).toBe(true);
  });

  it('preserves indentation inside fixtures', () => {
    const { fixtures } = parseTask(TASK);
    expect(fixtures[1]!.content).toContain('\n  return fn;\n');
  });

  it('takes expected_output from the Output Specification section only', () => {
    const { expectedOutput } = parseTask(TASK);
    expect(expectedOutput).toContain('Add a test file');
    expect(expectedOutput).toContain('Leave `src/save.test.js` alone.');
    expect(expectedOutput).not.toContain('Some prose');
    expect(expectedOutput).not.toContain('FILE:');
  });

  it('returns no fixtures when the task has no FILE markers', () => {
    const { fixtures, prompt } = parseTask('# Title\n\n## Output Specification\n\nDo a thing.\n');
    expect(fixtures).toEqual([]);
    expect(prompt).toContain('Do a thing.');
  });
});

describe('sectionBody', () => {
  it('returns empty string for a missing heading', () => {
    expect(sectionBody(TASK, 'Nonexistent')).toBe('');
  });

  it('stops at the next H2', () => {
    expect(sectionBody(TASK, 'Problem Description')).toBe('Some prose about the problem.');
  });
});
