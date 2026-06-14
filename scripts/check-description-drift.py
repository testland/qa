#!/usr/bin/env python3
"""scripts/check-description-drift.py - flag plugin.json descriptions whose
claimed component counts disagree with the files on disk.

The marketplace convention is to enumerate components in each plugin's
`plugin.json` `description` ("5 skills (...) and 2 agents (...)"). That
enumeration silently rots every time a component is added or moved, and
`plugin.json` is the description the plugin manager shows users at install
time (it is the authority under `strict: true`). This guard catches the drift.

How it works: for each `plugins/<name>/.claude-plugin/plugin.json`, it sums
every "<N> skills" and every "<N> agents" number found in the description and
compares those sums to the number of `skills/*/SKILL.md` and `agents/*.md`
files on disk. A description that states no count for a type is not checked for
that type (prose-only descriptions are allowed). Role bundles (no components)
have no counts and pass trivially.

Usage: python3 scripts/check-description-drift.py
Exit 0 = no drift; 1 = at least one description count disagrees with disk.
"""
from __future__ import annotations

import glob
import json
import re
import sys

# A leading negative lookbehind keeps us from reading the "2" in an agent-shape
# label like "A2 agent" as a count; the optional "A\d " group lets a real count
# that is followed by a shape label ("1 A2 agent") still register as 1.
SKILLS_RE = re.compile(r"(?<![A-Za-z0-9])(\d+)\s+skills?\b", re.IGNORECASE)
AGENTS_RE = re.compile(r"(?<![A-Za-z0-9])(\d+)\s+(?:A\d\s+)?agents?\b", re.IGNORECASE)


def disk_counts(plugin_dir: str) -> tuple[int, int]:
    skills = len(glob.glob(f"{plugin_dir}/skills/*/SKILL.md"))
    agents = len(glob.glob(f"{plugin_dir}/agents/*.md"))
    return skills, agents


def main() -> int:
    problems = []
    checked = 0
    for manifest in sorted(glob.glob("plugins/*/.claude-plugin/plugin.json")):
        manifest = manifest.replace("\\", "/")
        plugin_dir = manifest.rsplit("/.claude-plugin/", 1)[0]
        try:
            with open(manifest, encoding="utf-8") as f:
                desc = json.load(f).get("description", "")
        except (OSError, json.JSONDecodeError) as e:
            problems.append(f"{manifest}: cannot read ({e})")
            continue
        disk_skills, disk_agents = disk_counts(plugin_dir)

        skill_nums = [int(n) for n in SKILLS_RE.findall(desc)]
        agent_nums = [int(n) for n in AGENTS_RE.findall(desc)]
        checked += 1

        if skill_nums and sum(skill_nums) != disk_skills:
            problems.append(
                f"{plugin_dir}: description claims {sum(skill_nums)} skills "
                f"(from {skill_nums}) but {disk_skills} SKILL.md on disk"
            )
        if agent_nums and sum(agent_nums) != disk_agents:
            problems.append(
                f"{plugin_dir}: description claims {sum(agent_nums)} agents "
                f"(from {agent_nums}) but {disk_agents} agent .md on disk"
            )

    print(f"description-drift: scanned {checked} plugin manifests")
    if problems:
        print(f"description-drift: {len(problems)} mismatch(es):")
        for p in problems:
            print(f"  FAIL {p}")
        return 1
    print("description-drift: all enumerated component counts match disk")
    return 0


if __name__ == "__main__":
    sys.exit(main())
