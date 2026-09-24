// Structural checks over a .jmx before it reaches CI. Deliberately regex-based:
// the build agent has no XML parser dependency and we are not adding one.

export const rules = [
  {
    id: 'threadgroup-duration',
    describe: 'every ThreadGroup sets a scheduler duration',
    check(xml) {
      const groups = xml.match(/<ThreadGroup\b[\s\S]*?<\/ThreadGroup>/g) ?? [];
      return groups
        .filter((g) => !/ThreadGroup\.duration">\s*[^<\s]/.test(g))
        .map(() => 'a ThreadGroup has no scheduler duration');
    },
  },
];

export function lint(xml) {
  return rules.flatMap((rule) =>
    rule.check(xml).map((message) => ({ rule: rule.id, message })),
  );
}
