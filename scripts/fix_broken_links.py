#!/usr/bin/env python3
"""One-off: find (and with --apply, fix) broken relative .md links in plugins/.

Skips fenced code blocks and template placeholders (<...>). For each broken
link, resolves the intended target by matching the path tail against the real
component tree (cross-plugin > same-plugin skill > agent > plugin README) and
rewrites it as the correct relative path from the source file. Unresolvable
links are reported for manual review.

Usage:
  python scripts/fix_broken_links.py          # report only
  python scripts/fix_broken_links.py --apply  # rewrite files
"""
from __future__ import annotations

import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLUGINS = os.path.join(ROOT, "plugins")

LINK_RE = re.compile(r"\]\(((?!https?://|mailto:|#)[^)\s#]+\.md)(#[^)]*)?\)")
FENCE_RE = re.compile(r"^(```|~~~)")

# Build component maps.
plugin_names = sorted(
    d for d in os.listdir(PLUGINS) if os.path.isdir(os.path.join(PLUGINS, d))
)
skill_owner: dict[str, list[str]] = {}
agent_owner: dict[str, list[str]] = {}
for p in plugin_names:
    sdir = os.path.join(PLUGINS, p, "skills")
    if os.path.isdir(sdir):
        for s in os.listdir(sdir):
            if os.path.isfile(os.path.join(sdir, s, "SKILL.md")):
                skill_owner.setdefault(s, []).append(p)
    adir = os.path.join(PLUGINS, p, "agents")
    if os.path.isdir(adir):
        for f in os.listdir(adir):
            if f.endswith(".md"):
                agent_owner.setdefault(f[:-3], []).append(p)


def resolve_target(raw: str, src_dir: str) -> str | None:
    """Repo-absolute path of the intended target, or None."""
    tail = re.sub(r"^(\.\.?/)+", "", raw)

    # Cross-plugin shapes with an explicit plugin segment.
    m = re.match(r"^([a-z0-9-]+)/(skills/[^/]+/(?:SKILL|references/[^/]+)\.md|agents/[^/]+\.md|README\.md)$", tail)
    if m and m.group(1) in plugin_names:
        cand = os.path.join(PLUGINS, m.group(1), *m.group(2).split("/"))
        if os.path.isfile(cand):
            return cand

    # skills/<s>/SKILL.md without a plugin segment.
    m = re.match(r"^skills/([^/]+)/SKILL\.md$", tail)
    if m:
        owners = skill_owner.get(m.group(1), [])
        if len(owners) == 1:
            return os.path.join(PLUGINS, owners[0], "skills", m.group(1), "SKILL.md")

    # agents/<a>.md without a plugin segment.
    m = re.match(r"^agents/([^/]+)\.md$", tail)
    if m:
        owners = agent_owner.get(m.group(1), [])
        if len(owners) == 1:
            return os.path.join(PLUGINS, owners[0], "agents", m.group(1) + ".md")

    # <x>/SKILL.md — a sibling skill or a plugin referenced as if it were one.
    m = re.match(r"^([^/]+)/SKILL\.md$", tail)
    if m:
        owners = skill_owner.get(m.group(1), [])
        if len(owners) == 1:
            return os.path.join(PLUGINS, owners[0], "skills", m.group(1), "SKILL.md")
        if m.group(1) in plugin_names:
            return os.path.join(PLUGINS, m.group(1), "README.md")

    # Bare <a>.md — a sibling agent.
    m = re.match(r"^([^/]+)\.md$", tail)
    if m:
        owners = agent_owner.get(m.group(1), [])
        if len(owners) == 1:
            return os.path.join(PLUGINS, owners[0], "agents", m.group(1) + ".md")

    return None


apply = "--apply" in sys.argv
fixed = 0
unresolved: list[tuple[str, str]] = []

for dirpath, _dirnames, filenames in os.walk(PLUGINS):
    for fn in filenames:
        if not fn.endswith(".md"):
            continue
        path = os.path.join(dirpath, fn)
        rel_file = os.path.relpath(path, ROOT).replace("\\", "/")
        with open(path, encoding="utf-8", newline="") as f:
            text = f.read()

        lines = text.split("\n")
        in_fence = False
        changed = False
        for i, line in enumerate(lines):
            if FENCE_RE.match(line.strip()):
                in_fence = not in_fence
                continue
            if in_fence:
                continue

            def sub(m: re.Match[str]) -> str:
                global fixed, changed
                raw, frag = m.group(1), m.group(2) or ""
                if "<" in raw:  # template placeholder, intentional
                    return m.group(0)
                resolved = os.path.normpath(os.path.join(dirpath, raw))
                if os.path.isfile(resolved):
                    return m.group(0)
                target = resolve_target(raw, dirpath)
                if target is None:
                    unresolved.append((rel_file, raw))
                    return m.group(0)
                new_rel = os.path.relpath(target, dirpath).replace("\\", "/")
                fixed += 1
                changed = True
                print(f"  {rel_file}\n    {raw}  ->  {new_rel}")
                return f"]({new_rel}{frag})"

            lines[i] = LINK_RE.sub(sub, line)

        if changed and apply:
            with open(path, "w", encoding="utf-8", newline="") as f:
                f.write("\n".join(lines))

print(f"\n{'FIXED' if apply else 'WOULD FIX'}: {fixed}")
if unresolved:
    print(f"UNRESOLVED ({len(unresolved)}):")
    for rel_file, raw in unresolved:
        print(f"  {rel_file}: {raw}")
