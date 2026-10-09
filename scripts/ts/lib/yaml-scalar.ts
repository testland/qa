// Reads one top-level scalar from a frontmatter block, folding it the way YAML
// does. lib/frontmatter.ts stays a flat line reader on purpose; this exists for
// the checks that must see a value exactly as a YAML consumer does, such as the
// Tessl registry reading a multi-line quoted `description`.
//
// Covers the three flow styles (double-quoted, single-quoted, plain), each of
// which may span lines. Block scalars (`|`, `>`) throw, as no component uses
// them and folding them correctly needs a real YAML parser.

const ESCAPES: Record<string, string> = {
  '0': '\0',
  a: '\x07',
  b: '\b',
  t: '\t',
  '\t': '\t',
  n: '\n',
  v: '\v',
  f: '\f',
  r: '\r',
  e: '\x1b',
  ' ': ' ',
  '"': '"',
  '/': '/',
  '\\': '\\',
  N: '\x85',
  _: '\xa0',
  L: ' ',
  P: ' ',
};
const HEX_LEN: Record<string, number> = { x: 2, u: 4, U: 8 };

const isBlank = (c: string | undefined): boolean => c === ' ' || c === '\t';

/** Line folding shared by both quoted styles: drop leading blanks of the next
 *  line, then one break becomes a space and n+1 breaks become n newlines. */
function fold(src: string, i: number): [string, number] {
  let breaks = 0;
  while (src[i] === '\n') {
    breaks += 1;
    i += 1;
    while (isBlank(src[i])) i += 1;
  }
  return [breaks === 1 ? ' ' : '\n'.repeat(breaks - 1), i];
}

/** Body of a double-quoted scalar; `src` starts just after the opening quote. */
function doubleQuoted(src: string): string {
  let out = '';
  let pendingWs = '';
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (c === '"') return out + pendingWs;
    if (c === '\n') {
      // Unescaped blanks before a line break are not content.
      pendingWs = '';
      const [glue, next] = fold(src, i);
      out += glue;
      i = next;
      continue;
    }
    if (isBlank(c)) {
      pendingWs += c;
      i += 1;
      continue;
    }
    out += pendingWs;
    pendingWs = '';
    if (c !== '\\') {
      out += c;
      i += 1;
      continue;
    }
    const e = src[i + 1];
    if (e === '\n') {
      // Escaped line break: join the lines with nothing between them.
      i += 2;
      while (isBlank(src[i])) i += 1;
      continue;
    }
    if (e !== undefined && e in HEX_LEN) {
      const len = HEX_LEN[e]!;
      const hex = src.slice(i + 2, i + 2 + len);
      if (!new RegExp(`^[0-9a-fA-F]{${len}}$`).test(hex)) throw new Error(`bad \\${e} escape`);
      out += String.fromCodePoint(Number.parseInt(hex, 16));
      i += 2 + len;
      continue;
    }
    if (e === undefined || !(e in ESCAPES)) throw new Error(`unknown escape \\${e ?? ''}`);
    out += ESCAPES[e];
    i += 2;
  }
  throw new Error('unterminated double-quoted scalar');
}

/** Body of a single-quoted scalar; `src` starts just after the opening quote. */
function singleQuoted(src: string): string {
  let out = '';
  let pendingWs = '';
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (c === "'") {
      if (src[i + 1] !== "'") return out + pendingWs;
      out += `${pendingWs}'`;
      pendingWs = '';
      i += 2;
      continue;
    }
    if (c === '\n') {
      pendingWs = '';
      const [glue, next] = fold(src, i);
      out += glue;
      i = next;
      continue;
    }
    if (isBlank(c)) {
      pendingWs += c;
      i += 1;
      continue;
    }
    out += pendingWs + c;
    pendingWs = '';
    i += 1;
  }
  throw new Error('unterminated single-quoted scalar');
}

/** A plain scalar: the first line plus any more-indented continuation lines. */
function plain(first: string, rest: string[]): string {
  const strip = (s: string): string => s.replace(/(^|\s)#.*$/, '').trim();
  let out = strip(first);
  let breaks = 0;
  for (const line of rest) {
    if (!line.trim()) {
      breaks += 1;
      continue;
    }
    if (!isBlank(line[0])) break;
    out += breaks ? '\n'.repeat(breaks) : ' ';
    out += strip(line);
    breaks = 0;
  }
  return out;
}

/** Value of top-level `key` in a frontmatter block, or null when absent.
 *  Throws on a malformed value or a block scalar. */
export function scalarField(fm: string, key: string): string | null {
  const lines = fm.replace(/\r\n/g, '\n').split('\n');
  const re = new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:(?:[ \\t]+(.*))?$`);
  for (let n = 0; n < lines.length; n++) {
    const m = re.exec(lines[n]!);
    if (!m) continue;
    const value = (m[1] ?? '').trim();
    const after = lines.slice(n + 1).join('\n');
    if (value.startsWith('"')) return doubleQuoted(`${value.slice(1)}\n${after}`);
    if (value.startsWith("'")) return singleQuoted(`${value.slice(1)}\n${after}`);
    if (value.startsWith('|') || value.startsWith('>')) {
      throw new Error(`block scalar for '${key}' is not supported; use a quoted string`);
    }
    return plain(value, lines.slice(n + 1));
  }
  return null;
}
