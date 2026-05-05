#!/usr/bin/env python3
"""Walk testland-qa, extract every component's frontmatter + classification."""
import glob
import json
import os
import re
import sys
from collections import defaultdict


def parse_frontmatter(path):
    with open(path, encoding="utf-8") as fp:
        content = fp.read()
    m = re.search(r"^---\n(.*?)\n---", content, re.DOTALL | re.MULTILINE)
    if not m:
        return {}
    fm = m.group(1)
    out = {}
    for line in fm.splitlines():
        m2 = re.match(r"^(\w+):\s*(.*?)\s*$", line)
        if m2:
            key, val = m2.group(1), m2.group(2)
            out[key] = val.strip("\"'")
    skills_block = re.search(r"^skills:\s*\n((?:\s+-\s+.*\n?)+)", fm, re.MULTILINE)
    if skills_block:
        out["skills"] = re.findall(
            r"^\s+-\s+(.+)$", skills_block.group(1), re.MULTILINE
        )
    return out


def main():
    components = []
    by_plugin = defaultdict(list)
    archetype_counts = defaultdict(int)

    # Skills
    for skill_md in sorted(glob.glob("plugins/*/skills/*/SKILL.md")):
        parts = skill_md.replace(os.sep, "/").split("/")
        plugin = parts[1]
        name = parts[3]
        fm = parse_frontmatter(skill_md)
        rec = {
            "kind": "skill",
            "plugin": plugin,
            "name": name,
            "archetype": fm.get("archetype", "?"),
            "rating": int(fm.get("rating", 0)),
            "d6": int(fm.get("d6", 0)),
            "description": fm.get("description", ""),
        }
        components.append(rec)
        by_plugin[plugin].append(rec)
        archetype_counts[rec["archetype"]] += 1

    # Agents
    for agent_md in sorted(glob.glob("plugins/*/agents/*.md")):
        if agent_md.endswith(".gitkeep"):
            continue
        parts = agent_md.replace(os.sep, "/").split("/")
        plugin = parts[1]
        name = os.path.basename(agent_md).replace(".md", "")
        fm = parse_frontmatter(agent_md)
        rec = {
            "kind": "agent",
            "plugin": plugin,
            "name": name,
            "archetype": fm.get("archetype", "?"),
            "rating": int(fm.get("rating", 0)),
            "d6": int(fm.get("d6", 0)),
            "description": fm.get("description", ""),
            "preloads": fm.get("skills", []),
        }
        components.append(rec)
        by_plugin[plugin].append(rec)
        archetype_counts[rec["archetype"]] += 1

    if "--json" in sys.argv:
        print(json.dumps({"components": components}, indent=2))
        return 0

    print(f"=== Marketplace inventory ===")
    print(f"Total plugins: {len(by_plugin)}")
    print(f"Total components: {len(components)}")
    skills = [c for c in components if c["kind"] == "skill"]
    agents = [c for c in components if c["kind"] == "agent"]
    print(f"  Skills: {len(skills)}")
    print(f"  Agents: {len(agents)}")
    print()
    print("=== Archetype distribution ===")
    for a in sorted(archetype_counts):
        print(f"  {a}: {archetype_counts[a]}")
    print()
    print("=== Rating distribution ===")
    rating_counts = defaultdict(int)
    for c in components:
        rating_counts[c["rating"]] += 1
    for r in sorted(rating_counts):
        print(f"  {r}: {rating_counts[r]}")
    print()
    print("=== d6 distribution ===")
    d6_counts = defaultdict(int)
    for c in components:
        d6_counts[c["d6"]] += 1
    for d in sorted(d6_counts):
        print(f"  d6={d}: {d6_counts[d]}")
    print()
    print("=== Per-plugin counts ===")
    for p in sorted(by_plugin):
        s = sum(1 for c in by_plugin[p] if c["kind"] == "skill")
        a = sum(1 for c in by_plugin[p] if c["kind"] == "agent")
        avg_rating = sum(c["rating"] for c in by_plugin[p]) / len(by_plugin[p])
        print(f"  {p}: {s + a} ({s} skills + {a} agents) avg rating {avg_rating:.1f}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
