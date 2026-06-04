#!/usr/bin/env python3
"""scripts/content-audit.py — mechanical content checks.

A flat list of automated pass/fail checks on component bodies. These are lint
guardrails, NOT the quality rubric: the human review scores the six dimensions
D1-D6 into the `rating` (+ `d6` floor) — see docs/REVIEWER_CHECKLIST.md. This
script just catches objective violations.

  CRITICAL (block merge under --strict):
    - desc_too_long            description > 1024 chars (Anthropic spec cap)
    - body_too_long            body over the type cap (skill 600 / agent 350)
    - unparseable_frontmatter

  WARNING (advisory, never blocks):
    - windows_path             Windows backslash paths in body (vendor allowlist)
    - skill_body_over_500      skill body over Anthropic's 500-line guidance
    - readme_count_mismatch    README component-table row count != SKILL.md +
                               agent .md files on disk. Advisory while the
                               backlog is burned down; promote to CRITICAL once
                               all plugin READMEs enumerate their components.

Usage: python3 scripts/content-audit.py [--strict]
"""
import re, os, glob
from collections import defaultdict

# Body-length ceilings keyed on component TYPE (skill vs agent). Anthropic's
# only published length guidance is "keep SKILL.md under 500 lines"; agents have
# no published cap (they run in their own context). These hard caps are generous
# absolute ceilings — "something is structurally wrong if exceeded".
SKILL_BODY_HARDCAP = 600
AGENT_BODY_HARDCAP = 350
SKILL_BODY_ADVISORY = 500  # Anthropic's published SKILL.md guidance

# Allowlist for windows_path — components where citing a literal Windows path is
# the documented canonical install/usage location for a Windows-only tool, not a
# hygiene oversight. Reviewed 2026-05-27; vendor-canonical paths only.
WINDOWS_PATH_ALLOWLIST = {
    "plugins/qa-desktop/skills/appium-windows-driver/SKILL.md",
    "plugins/qa-desktop/skills/winappdriver/SKILL.md",
    "plugins/qa-game/skills/unity-test-framework/SKILL.md",
    "plugins/qa-desktop/skills/desktop-test-strategy-reference/SKILL.md",
}


def parse_frontmatter(path):
    try:
        with open(path, encoding="utf-8") as f:
            c = f.read()
    except Exception:
        return None, ""
    if not c.startswith("---"):
        return None, c
    parts = c.split("---", 2)
    if len(parts) < 3:
        return None, c
    fm_text, body = parts[1], parts[2]
    m = re.search(r'description:\s*"(.*?)"\s*\n[a-z_-]+:', fm_text, re.DOTALL)
    if m:
        desc = m.group(1)
    else:
        m2 = re.search(r'^description:\s*"?(.*?)"?\s*$', fm_text, re.MULTILINE)
        desc = m2.group(1) if m2 else ""
    return {"_description_raw": desc}, body


def find_components():
    paths = []
    for pat in ["plugins/*/skills/*/SKILL.md", "plugins/*/agents/*.md"]:
        paths.extend(p.replace("\\", "/") for p in glob.glob(pat))
    return sorted(paths)


def audit():
    findings = defaultdict(list)
    total = 0
    for p in find_components():
        total += 1
        fm, body = parse_frontmatter(p)
        if fm is None:
            findings["unparseable_frontmatter"].append({"path": p})
            continue
        is_agent = "/agents/" in p
        desc_len = len(fm.get("_description_raw", ""))
        body_lines = body.count("\n")

        if desc_len > 1024:
            findings["desc_too_long"].append({"path": p, "desc_len": desc_len})

        cap = AGENT_BODY_HARDCAP if is_agent else SKILL_BODY_HARDCAP
        if body_lines > cap:
            findings["body_too_long"].append({"path": p, "body_lines": body_lines, "cap": cap})

        win_drive = re.compile(r"`[^`\n]*[A-Z]:\\[A-Za-z]")
        win_multi = re.compile(r"`[^`\n]*\\[A-Z][A-Za-z0-9_. -]*\\[A-Z]")
        link_drive = re.compile(r"\]\([^)]*[A-Z]:\\[A-Za-z]")
        link_multi = re.compile(r"\]\([^)]*\\[A-Z][A-Za-z0-9_. -]*\\[A-Z]")
        if (win_drive.search(body) or win_multi.search(body)
                or link_drive.search(body) or link_multi.search(body)):
            if p not in WINDOWS_PATH_ALLOWLIST:
                findings["windows_path"].append({"path": p})

        if not is_agent and body_lines > SKILL_BODY_ADVISORY:
            findings["skill_body_over_500"].append({"path": p, "body_lines": body_lines})

    # README component-table vs filesystem: every plugin README lists its
    # components in a markdown table whose rows start `| Skill |` / `| Agent |`.
    # That row count must equal the number of SKILL.md + agent .md files on disk,
    # or the catalog page misleads users browsing the README.
    for readme in sorted(glob.glob("plugins/*/README.md")):
        readme = readme.replace("\\", "/")
        plugin = readme.split("/")[1]
        disk = len(glob.glob(f"plugins/{plugin}/skills/*/SKILL.md")) + len(
            glob.glob(f"plugins/{plugin}/agents/*.md")
        )
        rows = 0
        with open(readme, encoding="utf-8") as fh:
            for line in fh:
                cells = [c.strip() for c in line.split("|")]
                if len(cells) >= 3 and cells[1].lower() in ("skill", "agent"):
                    rows += 1
        if rows != disk:
            findings["readme_count_mismatch"].append(
                {"path": readme, "readme_rows": rows, "disk": disk}
            )

    return findings, total


if __name__ == "__main__":
    import sys
    strict = "--strict" in sys.argv

    findings, total = audit()
    print("# Content audit\n")
    print(f"**Components scanned:** {total}  ")
    print(f"**Mode:** {'strict (fail on critical)' if strict else 'advisory'}\n")

    severity = [
        ("desc_too_long", "CRITICAL"),
        ("body_too_long", "CRITICAL"),
        ("unparseable_frontmatter", "CRITICAL"),
        ("readme_count_mismatch", "WARNING"),
        ("windows_path", "WARNING"),
        ("skill_body_over_500", "WARNING"),
    ]
    critical = 0
    for key, sev in severity:
        items = findings.get(key, [])
        print(f"### [{sev}] {key} — {len(items)}")
        for it in items[:30]:
            print(f"- `{it['path']}`" + "".join(f" ({k}={v})" for k, v in it.items() if k != "path"))
        print()
        if sev == "CRITICAL":
            critical += len(items)

    if strict and critical:
        print(f"[content-audit] {critical} critical finding(s); exiting 1")
        sys.exit(1)
    print(f"[content-audit] {'no critical findings' if not critical else str(critical)+' critical (advisory)'}")
