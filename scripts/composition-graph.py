#!/usr/bin/env python3
"""Build the agent -> skill preload graph and validate cross-plugin deps."""
import glob
import os
import re
import sys


def main() -> int:
    skill_to_plugin = {}
    for skill_md in glob.glob("plugins/*/skills/*/SKILL.md"):
        parts = skill_md.replace(os.sep, "/").split("/")
        plugin = parts[1]
        skill = parts[3]
        skill_to_plugin[skill] = plugin

    issues = []
    agent_data = []
    for agent_md in sorted(glob.glob("plugins/*/agents/*.md")):
        if agent_md.endswith(".gitkeep"):
            continue
        parts = agent_md.replace(os.sep, "/").split("/")
        plugin = parts[1]
        agent = os.path.basename(agent_md).replace(".md", "")
        with open(agent_md, encoding="utf-8") as fp:
            content = fp.read()
        m = re.search(r"^---\n(.*?)\n---", content, re.DOTALL | re.MULTILINE)
        if not m:
            continue
        fm = m.group(1)
        m2 = re.search(r"^skills:\s*\n((?:\s+-\s+.*\n?)+)", fm, re.MULTILINE)
        if not m2:
            agent_data.append((plugin, agent, []))
            continue
        items = re.findall(r"^\s+-\s+(.+)$", m2.group(1), re.MULTILINE)
        skills = [s.strip() for s in items]
        agent_data.append((plugin, agent, skills))
        for s in skills:
            if s not in skill_to_plugin:
                issues.append(
                    f"MISSING: {plugin}/{agent} preloads `{s}` which does not exist"
                )

    print("=== Composition graph validation ===")
    if not issues:
        print("All preloaded skills resolve to a plugin.")
    else:
        for i in issues:
            print(i)

    print()
    print("=== Cross-plugin preloads ===")
    cross = []
    for p, a, ss in agent_data:
        for s in ss:
            if s in skill_to_plugin and skill_to_plugin[s] != p:
                cross.append((p, a, skill_to_plugin[s], s))
    if not cross:
        print("None.")
    for p, a, sp, s in cross:
        print(f"{p}/{a} -> {sp}/{s}")

    print()
    print("=== Stats ===")
    total_agents = len(agent_data)
    with_preloads = sum(1 for _, _, ss in agent_data if ss)
    print(f"Total agents: {total_agents}")
    print(f"Agents with `skills:` preloads: {with_preloads}")
    print(f"Agents without preloads: {total_agents - with_preloads}")
    print(f"Total skills: {len(skill_to_plugin)}")
    print(f"Cross-plugin preload edges: {len(cross)}")

    return 1 if issues else 0


if __name__ == "__main__":
    sys.exit(main())
