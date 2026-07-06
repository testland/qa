#!/usr/bin/env python3
"""Generate CATALOG.md from .claude-plugin/marketplace.json + per-plugin manifests.

Reads:
  .claude-plugin/marketplace.json
  plugins/<name>/.claude-plugin/plugin.json
  plugins/<name>/skills/<skill>/SKILL.md     (frontmatter)
  plugins/<name>/agents/<agent>.md           (frontmatter)

Writes:
  CATALOG.md (at repo root)

The catalog is grouped by the `category` field on each plugin entry in
marketplace.json. Plugins with no category fall under "Uncategorized" and
the script exits 1 (so CI catches it).

CI invokes:
    python3 scripts/generate-catalog.py
    git diff --exit-code CATALOG.md
"""
from __future__ import annotations

import glob
import json
import os
import re
import sys
from collections import defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
MARKETPLACE_JSON = REPO_ROOT / ".claude-plugin" / "marketplace.json"
CATALOG_MD = REPO_ROOT / "CATALOG.md"

CATEGORY_ORDER = [
    ("foundations", "Foundations", "Test process, environment, data, reporting, impact, roles, review."),
    ("functional-testing", "Functional testing", "API, BDD, E2E, mobile, contract, mutation, property-based, per-language unit tests."),
    ("quality-engineering", "Quality engineering", "Data quality, visual regression, accessibility, localization, charts, PDF/print, modern web."),
    ("security-compliance", "Security & compliance", "SAST, DAST, SCA, secrets, SBOM, compliance."),
    ("operations-resilience", "Operations & resilience", "Flake triage, bug repro, chaos, resilience drills, shift-right/left, load."),
    ("backend-distributed", "Backend & distributed systems", "DB migrations, async jobs, caching, concurrency, distributed tracing, saga/CQRS, serverless, time & timezones."),
    ("integrations-protocols", "Integrations & protocols", "GraphQL, gRPC, real-time protocols, auth flows, notifications, payment, feature flags, experimentation."),
    ("ai-ml", "AI & ML", "LLM evaluation, ML model testing, AI-assisted test generation, data notebooks, search relevance."),
    ("tooling", "Tooling", "IaC, CI integration, CLI tools, code quality, compatibility, manual testing."),
    ("role-bundles", "Role bundles", "One-command role installs - each bundles a curated capability set as dependencies: qa-starter essentials plus frontend, backend, security, performance, mobile/desktop, AI/ML & data, and leadership."),
]
CATEGORY_KEYS = {k for k, _, _ in CATEGORY_ORDER}


def parse_frontmatter(path: Path) -> dict:
    with path.open(encoding="utf-8") as fp:
        content = fp.read()
    m = re.search(r"^---\n(.*?)\n---", content, re.DOTALL | re.MULTILINE)
    if not m:
        return {}
    fm = m.group(1)
    out: dict = {}
    for line in fm.splitlines():
        m2 = re.match(r"^(\w+):\s*(.*?)\s*$", line)
        if m2:
            key, val = m2.group(1), m2.group(2)
            out[key] = val.strip("\"'")
    return out


def count_components(plugin_dir: Path) -> dict:
    skills: list[str] = []
    agents: list[str] = []
    for skill_md in sorted(glob.glob(str(plugin_dir / "skills" / "*" / "SKILL.md"))):
        skills.append(Path(skill_md).parent.name)
    for agent_md in sorted(glob.glob(str(plugin_dir / "agents" / "*.md"))):
        if agent_md.endswith(".gitkeep"):
            continue
        agents.append(Path(agent_md).stem)
    return {
        "skills": skills,
        "agents": agents,
        "skill_count": len(skills),
        "agent_count": len(agents),
    }


def main() -> int:
    if not MARKETPLACE_JSON.exists():
        print(f"error: {MARKETPLACE_JSON} not found", file=sys.stderr)
        return 1

    with MARKETPLACE_JSON.open(encoding="utf-8") as fp:
        marketplace = json.load(fp)

    plugins = marketplace.get("plugins", [])
    by_category: dict[str, list[dict]] = defaultdict(list)
    uncategorized: list[str] = []

    for entry in plugins:
        name = entry.get("name", "?")
        category = entry.get("category")
        if category not in CATEGORY_KEYS:
            uncategorized.append(name)
            category = "uncategorized"

        plugin_dir = REPO_ROOT / "plugins" / name
        manifest = plugin_dir / ".claude-plugin" / "plugin.json"
        version = "?"
        if manifest.exists():
            with manifest.open(encoding="utf-8") as fp:
                version = json.load(fp).get("version", "?")
        counts = count_components(plugin_dir)
        by_category[category].append({
            "name": name,
            "version": version,
            "description": entry.get("description", ""),
            "skill_count": counts["skill_count"],
            "agent_count": counts["agent_count"],
        })

    lines: list[str] = []
    lines.append("# Catalog")
    lines.append("")
    lines.append("Auto-generated from `.claude-plugin/marketplace.json` and per-plugin manifests.")
    lines.append("Do not edit by hand - run `make catalog` (or `python3 scripts/generate-catalog.py`).")
    lines.append("")
    total_plugins = len(plugins)
    total_components = sum(p["skill_count"] + p["agent_count"]
                            for plist in by_category.values() for p in plist)
    lines.append(f"**{total_plugins} plugins · {total_components} components**")
    lines.append("")
    lines.append(
        "Within each category, plugins are sorted by **Total** (skills + agents); "
        "larger plugins cover more of an area."
    )
    lines.append("")

    for key, label, sub in CATEGORY_ORDER:
        bucket = sorted(
            by_category.get(key, []),
            key=lambda p: (-(p["skill_count"] + p["agent_count"]), p["name"]),
        )
        if not bucket:
            continue
        lines.append(f"## {label}")
        lines.append("")
        lines.append(f"_{sub}_")
        lines.append("")
        lines.append("| Plugin | Version | Components | Total |")
        lines.append("|---|---|---|---:|")
        for p in bucket:
            total = p["skill_count"] + p["agent_count"]
            comp = f"{p['skill_count']} skills + {p['agent_count']} agents"
            lines.append(
                f"| [{p['name']}](plugins/{p['name']}/) | {p['version']} | {comp} | {total} |"
            )
        lines.append("")

    if uncategorized:
        lines.append("## Uncategorized")
        lines.append("")
        lines.append("These plugins are missing the `category` field in `marketplace.json`.")
        lines.append("Add one of: " + ", ".join(f"`{k}`" for k in CATEGORY_KEYS))
        lines.append("")
        for n in sorted(uncategorized):
            lines.append(f"- [{n}](plugins/{n}/)")
        lines.append("")

    lines.append("## Alphabetical index")
    lines.append("")
    all_names: list[str] = []
    for plist in by_category.values():
        all_names.extend(p["name"] for p in plist)
    for n in sorted(set(all_names)):
        lines.append(f"- [{n}](plugins/{n}/)")
    lines.append("")

    CATALOG_MD.write_text("\n".join(lines), encoding="utf-8")
    print(f"wrote {CATALOG_MD} ({total_plugins} plugins, {total_components} components)")

    if uncategorized:
        print(
            f"error: {len(uncategorized)} plugin(s) missing category: "
            + ", ".join(uncategorized),
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
