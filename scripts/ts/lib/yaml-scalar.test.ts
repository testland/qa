// Expected values were produced by PyYAML's safe_load on the same input, so a
// pass means this reader folds and unescapes as a YAML consumer does.

import { describe, expect, it } from 'vitest';
import { scalarField } from './yaml-scalar.ts';

describe('scalarField', () => {
  it('returns null when the key is absent', () => {
    expect(scalarField('name: x', 'description')).toBeNull();
  });

  it('reads a single-line double-quoted value with escapes', () => {
    expect(scalarField('description: "tab\\tend  "', 'description')).toBe('tab\tend  ');
    expect(scalarField('description: "say \\"hi\\" \\\\ \\u00d7"', 'description')).toBe('say "hi" \\ ×');
  });

  it('folds a multi-line double-quoted value', () => {
    const fm = 'description: "a\\\\b \\" c\n  d  \n\n  e\\\n  f \\u00d7 \\x41"\nother: y';
    expect(scalarField(fm, 'description')).toBe('a\\b " c d\nef × A');
  });

  it('folds a single-quoted value and unescapes doubled quotes', () => {
    expect(scalarField("description: 'it''s\n  folded  \n\n\n  x'", 'description')).toBe("it's folded\n\nx");
  });

  it('folds a plain value and stops at the next key', () => {
    expect(scalarField('description: plain text\n  more\n\n  last\nother: x', 'description')).toBe(
      'plain text more\nlast',
    );
    expect(scalarField('description: one # comment\nx: 1', 'description')).toBe('one');
  });

  it('rejects block scalars and unterminated quotes', () => {
    expect(() => scalarField('description: >\n  text', 'description')).toThrow(/block scalar/);
    expect(() => scalarField('description: "open\n  never closed', 'description')).toThrow(/unterminated/);
  });
});
