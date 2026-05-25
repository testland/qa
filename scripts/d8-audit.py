#!/usr/bin/env python3
"""D8 mechanical audit — finds hard violations across all components.

Outputs a markdown report with severity-tagged findings:
- CRITICAL: D1 / D2 / D7 hard violations (would block merge under cutover)
- IMPORTANT: D5 / D8 hygiene violations (Windows paths, multi-option, etc.)
- ADVISORY: signals worth LLM review (long bodies, dense option lists)
"""
import re, os, glob, json
from collections import defaultdict

ROOT = "."
ARCH_HARD_CAP = {
    "S1": 500, "S2": 500, "S3": 600, "S4": 300,
    "A1": 100, "A2": 150, "A3": 350, "A4": 150,
}
ARCH_REC_MIN = {
    "S1": 100, "S2": 80, "S3": 100, "S4": 80,
    "A1": 30, "A2": 30, "A3": 80, "A4": 30,
}
ARCH_REC_MAX = {
    "S1": 500, "S2": 500, "S3": 600, "S4": 300,
    "A1": 80, "A2": 100, "A3": 300, "A4": 120,
}

def parse_frontmatter(path):
    try:
        with open(path, encoding='utf-8') as f:
            c = f.read()
    except Exception:
        return None, ""
    if not c.startswith("---"):
        return None, c
    parts = c.split("---", 2)
    if len(parts) < 3:
        return None, c
    fm_text, body = parts[1], parts[2]
    fm = {}
    for line in fm_text.split("\n"):
        m = re.match(r"^([a-z_-]+):\s*(.*)$", line)
        if m:
            k, v = m.group(1), m.group(2).strip()
            fm[k] = v
    # extract description (may be multi-line quoted)
    m = re.search(r'description:\s*"(.*?)"\s*\n[a-z_-]+:', fm_text, re.DOTALL)
    if m:
        fm["_description_raw"] = m.group(1)
    else:
        m2 = re.match(r'^"?(.*?)"?$', fm.get("description", ""))
        fm["_description_raw"] = m2.group(1) if m2 else ""
    return fm, body

def archetype(fm):
    a = fm.get("archetype", "").strip().strip('"').upper()
    if a in ARCH_HARD_CAP:
        return a
    return None

def is_eval_file(path):
    return "/evals/" in path.replace("\\", "/")

def find_components():
    paths = []
    for pat in ["plugins/*/skills/*/SKILL.md", "plugins/*/agents/*.md"]:
        for p in glob.glob(pat):
            if is_eval_file(p):
                continue
            paths.append(p.replace("\\", "/"))
    return paths

def has_eval_dir(agent_path):
    base = agent_path[:-3]  # strip .md
    return os.path.isdir(base) and any(
        os.path.exists(os.path.join(base, "evals", "evals.md")),
        # fall through; we'll just check the canonical path
    ) if False else os.path.exists(os.path.join(base, "evals", "evals.md"))

def audit():
    findings = defaultdict(list)
    component_data = []
    for p in find_components():
        fm, body = parse_frontmatter(p)
        if fm is None:
            findings["UNPARSEABLE"].append({"path": p})
            continue
        desc = fm.get("_description_raw", "")
        desc_len = len(desc)
        body_lines = body.count("\n")
        arch = archetype(fm)
        is_agent = "/agents/" in p
        component_data.append({"path": p, "arch": arch, "desc_len": desc_len, "body_lines": body_lines, "is_agent": is_agent})

        # CRITICAL: description over 1024 cap (D1 spec violation)
        if desc_len > 1024:
            findings["D1_desc_over_1024"].append({"path": p, "desc_len": desc_len})

        # CRITICAL: body over archetype hard cap (D2)
        if arch and body_lines > ARCH_HARD_CAP[arch]:
            findings["D2_body_over_hardcap"].append({"path": p, "arch": arch, "body_lines": body_lines, "cap": ARCH_HARD_CAP[arch]})

        # IMPORTANT: body over archetype recommended max (D2 calibration)
        if arch and body_lines > ARCH_REC_MAX[arch] and (not arch or body_lines <= ARCH_HARD_CAP[arch]):
            findings["D2_body_over_recommended"].append({"path": p, "arch": arch, "body_lines": body_lines, "max": ARCH_REC_MAX[arch]})

        # CRITICAL: agent missing eval file (D7 hard reject after 2026-06-01)
        if is_agent:
            base = p[:-3]
            eval_path = os.path.join(base, "evals", "evals.md")
            alt_eval_path = base + ".evals.md"
            if not (os.path.exists(eval_path) or os.path.exists(alt_eval_path)):
                findings["D7_missing_evals"].append({"path": p})

        # IMPORTANT: Windows-style backslash paths in body (D5 hygiene / D8 sub-check 5)
        # heuristic: backslash in inline code or markdown link
        if re.search(r"`[^`\n]*\[a-zA-Z_]", body) or re.search(r"\]\([^)]*\[a-zA-Z_]", body):
            findings["D8_windows_paths"].append({"path": p})

        # IMPORTANT: first-person opener in body (lint should catch; double-check)
        body_start = body.strip()[:200].lower()
        if body_start.startswith("you are ") or body_start.startswith("i help ") or body_start.startswith("i am "):
            findings["D3_first_person_opener"].append({"path": p})

        # ADVISORY: multi-option paralysis signal — body lists 4+ tools/options without "Default:" / "Recommended:" / "Use [X]"
        # heuristic: find "or" lists of 3+ proper-noun-ish tokens within a small window
        option_pattern = re.compile(r"(?:[A-Z][\w-]+(?:\.[a-z]+)?(?:\s*/\s*|\s*,\s*|\s+or\s+)){3,}[A-Z][\w-]+", re.MULTILINE)
        option_hits = option_pattern.findall(body)
        if option_hits and not re.search(r"(?i)(default[:\s]|recommended[:\s]|use\s+\*\*|primary\s+choice)", body):
            findings["D8_multi_option_no_default"].append({"path": p, "sample": option_hits[0][:120]})

        # ADVISORY: body > 500 lines (Anthropic's "keep SKILL.md body under 500 lines")
        if body_lines > 500 and not is_agent:
            findings["D2_body_over_500"].append({"path": p, "body_lines": body_lines})

    return findings, component_data

if __name__ == "__main__":
    findings, components = audit()
    total = len(components)
    print(f"# D8 Audit Report\n")
    print(f"**Total components scanned:** {total}\n")
    print(f"## Findings by category\n")
    severity_order = [
        ("D1_desc_over_1024", "CRITICAL"),
        ("D2_body_over_hardcap", "CRITICAL"),
        ("D7_missing_evals", "CRITICAL (after 2026-06-01)"),
        ("D8_windows_paths", "IMPORTANT"),
        ("D3_first_person_opener", "IMPORTANT"),
        ("D2_body_over_recommended", "IMPORTANT"),
        ("D8_multi_option_no_default", "ADVISORY"),
        ("D2_body_over_500", "ADVISORY"),
        ("UNPARSEABLE", "CRITICAL"),
    ]
    for key, sev in severity_order:
        items = findings.get(key, [])
        print(f"### [{sev}] {key} — {len(items)} components\n")
        for it in items[:30]:
            print(f"- `{it['path']}`" + " ".join(f"({k}={v})" for k,v in it.items() if k != "path"))
        if len(items) > 30:
            print(f"- ... ({len(items)-30} more)")
        print()
    # Component class distribution
    arch_counts = defaultdict(int)
    for c in components:
        if c["arch"]:
            arch_counts[c["arch"]] += 1
    print(f"## Archetype distribution\n")
    for k in sorted(arch_counts.keys()):
        print(f"- **{k}**: {arch_counts[k]} components")
