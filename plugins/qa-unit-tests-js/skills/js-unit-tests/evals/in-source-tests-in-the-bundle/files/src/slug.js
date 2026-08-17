export function slugify(input) {
  return input.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;

  it('slugifies a title', () => {
    expect(slugify(' Hello World! ')).toBe('hello-world');
  });
}
