// Reads the committed eval format:
//   plugins/<plugin>/skills/<skill>/evals/<scenario>/{task.md, criteria.json}
//
// This is the canonical source. It is Tessl-native, so nothing is generated for
// Tessl - `tessl skill publish` consumes these files as they sit. The Anthropic
// target is derived from the same two files by compile-evals.ts.
//
// The FILE-marker parsing here must stay byte-identical to the PowerShell
// harness in .qa-eval/pilot/evals-lib.ps1; both read the same committed files
// and a divergence would mean the local runs and CI measure different fixtures.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export interface Criterion {
  name: string;
  max_score: number;
  description: string;
  /** Tessl documents 7 categories but neither its own skills nor ours set it. */
  category?: string;
}

export interface Criteria {
  context?: string;
  type: string;
  checklist: Criterion[];
}

export interface Fixture {
  path: string;
  content: string;
}

export interface Scenario {
  plugin: string;
  skill: string;
  scenario: string;
  id: string;
  dir: string;
  /** Everything above `## Input Files` - what the agent is asked. */
  prompt: string;
  /** The `## Output Specification` body, used as Anthropic's expected_output. */
  expectedOutput: string;
  fixtures: Fixture[];
  criteria: Criteria;
}

const FILE_MARKER = /^=+[ \t]*FILE:[ \t]*(.+?)[ \t]*=+[ \t]*$/gm;
const INPUT_FILES_HEADING = /^##[ \t]+Input Files[ \t]*$/m;

/** Body of an H2 section, up to the next H2 or end of document. */
export function sectionBody(markdown: string, heading: string): string {
  const start = new RegExp(`^##[ \\t]+${heading}[ \\t]*$`, 'm').exec(markdown);
  if (!start) return '';
  const after = markdown.slice(start.index + start[0].length);
  const next = /^##[ \t]+/m.exec(after);
  return (next ? after.slice(0, next.index) : after).trim();
}

export function parseTask(taskMarkdown: string): {
  prompt: string;
  expectedOutput: string;
  fixtures: Fixture[];
} {
  const fixtures: Fixture[] = [];
  const marks = [...taskMarkdown.matchAll(FILE_MARKER)];
  for (let i = 0; i < marks.length; i++) {
    const m = marks[i]!;
    const from = m.index! + m[0].length;
    const to = i + 1 < marks.length ? marks[i + 1]!.index! : taskMarkdown.length;
    // Trim only line breaks, never indentation - fixtures are source files.
    fixtures.push({
      path: m[1]!.trim(),
      content: taskMarkdown.slice(from, to).replace(/^[\r\n]+/, '').replace(/[\r\n]+$/, '') + '\n',
    });
  }

  const cut = INPUT_FILES_HEADING.exec(taskMarkdown);
  const prompt = (cut ? taskMarkdown.slice(0, cut.index) : taskMarkdown).trim();

  return { prompt, expectedOutput: sectionBody(taskMarkdown, 'Output Specification'), fixtures };
}

function dirs(p: string): string[] {
  try {
    return readdirSync(p).filter((d) => statSync(join(p, d)).isDirectory());
  } catch {
    return [];
  }
}

/** Walks every plugin's skills and returns each eval scenario holding a criteria.json. */
export function loadScenarios(root: string): Scenario[] {
  const out: Scenario[] = [];
  const pluginsDir = join(root, 'plugins');

  for (const plugin of dirs(pluginsDir)) {
    const skillsDir = join(pluginsDir, plugin, 'skills');
    for (const skill of dirs(skillsDir)) {
      const evalsDir = join(skillsDir, skill, 'evals');
      for (const scenario of dirs(evalsDir)) {
        const dir = join(evalsDir, scenario);
        let criteriaRaw: string;
        try {
          criteriaRaw = readFileSync(join(dir, 'criteria.json'), 'utf8');
        } catch {
          continue; // not a scenario dir
        }
        // Normalise on read: task.md arrives CRLF on a Windows checkout, and the
        // drift gate compares bytes. Without this the generated output differs by
        // platform and CI disagrees with the machine that produced it.
        const taskMd = readFileSync(join(dir, 'task.md'), 'utf8').replace(/\r\n/g, '\n');
        const { prompt, expectedOutput, fixtures } = parseTask(taskMd);
        out.push({
          plugin,
          skill,
          scenario,
          id: `${plugin}__${skill}__${scenario}`,
          dir,
          prompt,
          expectedOutput,
          fixtures,
          criteria: JSON.parse(criteriaRaw) as Criteria,
        });
      }
    }
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}
