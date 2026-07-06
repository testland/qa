#!/usr/bin/env python3
"""scripts/validate.py — structural lint for plugin components.

Replaces the bash implementation (`validate.sh`) to gain ~10x speedup on
Windows MSYS2 and consolidate frontmatter parsing in one place.

Lint rules (anti-pattern guard):
  - Names: kebab-case, 1-64 chars, no anthropic/claude reserved words
  - Descriptions: present, third-person, no "You are..." / "I help..."
  - Description != slug
  - No literal placeholder strings (DESCRIPTION_PLACEHOLDER,
    CONTENT_PLACEHOLDER, TODO, FIXME)
  - No vague auto-gen pattern "Use when working with X tasks or workflows"
  - Command files must have a non-empty body
  - All plugin.json + marketplace.json files parse as valid JSON

Blocking:
  - No em/en dashes in prose (outside code); use a spaced hyphen ' - '

Advisory (WARN only, never changes the exit code):
  - Inline code holds literal tokens, not whole prose sentences

Note: persona-shaped scopes (qa-expert-style names without a trigger
condition) are NOT rejected here — the lint is structural only. Reviewer
judgment on D3 (description quality) and D4 (use-case fit) catches them.
See docs/CONTRIBUTING.md "Differentiation requirement".

Output format is preserved byte-for-byte from the bash implementation so
that test-validate.sh's grep-based assertions keep working unchanged.

Usage: python3 scripts/validate.py [ROOT]
   ROOT defaults to the current directory.
"""
from __future__ import annotations

import glob
import json
import os
import re
import sys

KEBAB_RE = re.compile(r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?$")
RESERVED_RE = re.compile(r"(anthropic|claude)")
PLACEHOLDER_RE = re.compile(r"DESCRIPTION_PLACEHOLDER|CONTENT_PLACEHOLDER")
TODO_RE = re.compile(r"(^|\s)(TODO|FIXME)(\s|$)", re.MULTILINE)

# Advisory prose-style checks (see docs/PLUGIN_AUTHORING.md "Prose style").
# These emit WARN lines but never change the exit code.
FENCE_RE = re.compile(r"^\s*(```|~~~)")
INLINE_CODE_RE = re.compile(r"`[^`\n]+`")
EM_EN_DASH_RE = re.compile("[–—]")  # en dash, em dash
# A whole guidance sentence wrapped in backticks: ALLCAPS_TOKEN <sep> words.
SENTENCE_IN_CODE_RE = re.compile(r"^[A-Z][A-Z0-9_]{3,}\s*[-–—:]\s+\w")


def extract_frontmatter(text: str) -> tuple[str, str]:
    """Return (frontmatter, body). Frontmatter is empty if not present."""
    if not text.startswith("---"):
        return "", text
    parts = text.split("---", 2)
    if len(parts) < 3:
        return "", text
    return parts[1], parts[2]


def fm_field(fm: str, key: str) -> str:
    """Read a single value from frontmatter (first match wins)."""
    for line in fm.splitlines():
        m = re.match(rf"^{re.escape(key)}:\s*(.*)$", line)
        if m:
            val = m.group(1).strip()
            # Strip outer quotes
            if (val.startswith('"') and val.endswith('"')) or (
                val.startswith("'") and val.endswith("'")
            ):
                val = val[1:-1]
            return val
    return ""


def fail(file: str, reason: str, exit_holder: list[int]) -> None:
    print(f"FAIL ({file}): {reason}")
    exit_holder[0] = 1


def warn(file: str, reason: str, warn_holder: list[int]) -> None:
    """Advisory only — prints a WARN line but never sets the exit code."""
    print(f"WARN ({file}): {reason}")
    warn_holder[0] += 1


def check_prose_style(file: str, exit_holder: list[int], warn_holder: list[int]) -> None:
    """Advisory style guard for the conventions in docs/PLUGIN_AUTHORING.md:

      - No em/en dashes in prose (use a spaced hyphen ' - ' or rewrite).
        Dashes inside code fences and inline code are left alone — they're code.
      - Inline code holds literal tokens, not whole prose sentences (the
        `UNRECOGNISED_ROLE — supply role ...` anti-pattern).
    """
    with open(file, encoding="utf-8") as f:
        text = f.read()

    in_fence = False
    dash_count = 0
    dash_first = None
    sentence_spans: list[tuple[int, str]] = []

    for lineno, raw in enumerate(text.split("\n"), 1):
        line = raw.rstrip("\r")
        if FENCE_RE.match(line):
            in_fence = not in_fence
            continue
        if in_fence:
            continue

        # Dashes: count only those outside inline code.
        prose = INLINE_CODE_RE.sub("", line)
        hits = len(EM_EN_DASH_RE.findall(prose))
        if hits:
            dash_count += hits
            if dash_first is None:
                dash_first = lineno

        # Sentence-in-inline-code: an ALLCAPS token + separator + words.
        for span in INLINE_CODE_RE.findall(line):
            inner = span[1:-1]
            if len(inner) > 40 and inner.count(" ") >= 2 and SENTENCE_IN_CODE_RE.match(inner):
                sentence_spans.append((lineno, inner[:48]))

    if dash_count:
        fail(
            file,
            f"{dash_count} em/en dash(es) in prose (first at line {dash_first}); "
            "use a spaced hyphen ' - ' or rewrite (docs/PLUGIN_AUTHORING.md Prose style)",
            exit_holder,
        )
    for lineno, snippet in sentence_spans:
        warn(
            file,
            f"line {lineno}: inline code reads like a prose sentence "
            f'("{snippet}..."); keep only the literal token in backticks, guidance as prose',
            warn_holder,
        )


def check_yaml_frontmatter(file: str, exit_holder: list[int]) -> None:
    with open(file, encoding="utf-8") as f:
        text = f.read()
    fm, _body = extract_frontmatter(text)

    if not fm.strip():
        fail(file, "missing YAML frontmatter", exit_holder)
        return

    name = fm_field(fm, "name")
    desc = fm_field(fm, "description")

    # Rule 1: name present
    if not name:
        fail(file, "missing name in frontmatter", exit_holder)
        return

    # Rule 2: kebab-case (no leading/trailing hyphen; no doubled hyphens)
    if not KEBAB_RE.match(name) or "--" in name:
        fail(file, f"name '{name}' is not kebab-case", exit_holder)

    # Rule 3: 1-64 chars
    if not (1 <= len(name) <= 64):
        fail(file, f"name '{name}' length out of range (1-64)", exit_holder)

    # Rule 4: reserved words
    if RESERVED_RE.search(name):
        fail(
            file,
            f"name '{name}' contains reserved word (anthropic/claude)",
            exit_holder,
        )

    # Rule 5: description present
    if not desc:
        fail(file, "empty description", exit_holder)
        return

    # Rule 6: not "You are..." / "I help..."
    # Scoped to the frontmatter `description:` field only — the body is
    # allowed to address the agent in second person, which is the Anthropic-
    # canonical pattern for adversarial-reviewer agents ("You are a senior
    # reviewer…"). Extending this check to the body would false-positive those
    # legitimate reviewer agents.
    desc_lower = desc.lower()
    if desc_lower.startswith("you are") or desc_lower.startswith("i help"):
        fail(
            file,
            "description starts with 'You are...' or 'I help...' (use third-person, action-oriented)",
            exit_holder,
        )

    # Rule 7: description != slug
    if desc == name:
        fail(file, "description equals slug", exit_holder)

    # Rule 8: no vague auto-gen pattern
    if "Use when working with" in desc and "tasks or workflows" in desc:
        fail(file, "vague auto-gen description pattern", exit_holder)


def check_no_placeholders(file: str, exit_holder: list[int]) -> None:
    with open(file, encoding="utf-8") as f:
        text = f.read()
    if PLACEHOLDER_RE.search(text):
        fail(
            file,
            "contains placeholder string (DESCRIPTION_PLACEHOLDER / CONTENT_PLACEHOLDER)",
            exit_holder,
        )
    if TODO_RE.search(text):
        # Allow tokens inside references/ subdirectories (docs about how to
        # mark TODOs).
        norm = file.replace("\\", "/")
        if "/references/" not in norm:
            fail(file, "contains literal TODO/FIXME token", exit_holder)


def check_empty_command_body(file: str, exit_holder: list[int]) -> None:
    with open(file, encoding="utf-8") as f:
        text = f.read()
    _fm, body = extract_frontmatter(text)
    if not body.strip():
        fail(file, "command has empty body", exit_holder)


def iter_components(root: str):
    """Skills, agents, and commands."""
    patterns = [
        os.path.join(root, "plugins", "*", "skills", "*", "SKILL.md"),
        os.path.join(root, "plugins", "*", "agents", "*.md"),
        os.path.join(root, "plugins", "*", "commands", "*.md"),
    ]
    seen = set()
    for pat in patterns:
        for p in glob.glob(pat):
            norm = p.replace("\\", "/")
            if norm not in seen:
                seen.add(norm)
                yield p


def iter_commands(root: str):
    return glob.glob(os.path.join(root, "plugins", "*", "commands", "*.md"))


def iter_json_files(root: str):
    files = []
    mp = os.path.join(root, ".claude-plugin", "marketplace.json")
    if os.path.isfile(mp):
        files.append(mp)
    files.extend(glob.glob(os.path.join(root, "plugins", "*", ".claude-plugin", "plugin.json")))
    return files


def main() -> int:
    root = sys.argv[1] if len(sys.argv) > 1 else "."
    exit_holder = [0]
    warn_holder = [0]

    for f in iter_components(root):
        check_yaml_frontmatter(f, exit_holder)
        check_no_placeholders(f, exit_holder)
        check_prose_style(f, exit_holder, warn_holder)

    for f in iter_commands(root):
        check_empty_command_body(f, exit_holder)

    # JSON syntax check
    for jf in iter_json_files(root):
        try:
            with open(jf, encoding="utf-8") as f:
                json.load(f)
        except (json.JSONDecodeError, OSError):
            fail(jf, "invalid JSON syntax", exit_holder)

    if warn_holder[0]:
        print(f"validate.sh: {warn_holder[0]} prose-style warning(s) (advisory — not blocking)")
    if exit_holder[0] == 0:
        print("validate.sh: all checks passed")
    return exit_holder[0]


if __name__ == "__main__":
    sys.exit(main())
