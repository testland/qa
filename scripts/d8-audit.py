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

# Allowlist for D8_windows_paths — components where citing a literal Windows
# path is the documented canonical install/usage location for a Windows-only
# tool, NOT a path-hygiene oversight. Each entry must be justified inline.
# Reviewed: 2026-05-27 against today's audit findings; the 3 paths below are
# all vendor-canonical Windows install paths in plugins that document
# Windows-only software. Forward-slash equivalents work on modern Windows but
# would silently make the documentation diverge from the vendor's own quick
# starts. Keep the list small and review on each addition.
D8_WINDOWS_PATHS_ALLOWLIST = {
    # Appium Windows Driver — Microsoft-documented install location. Per WinAppDriver README.
    "plugins/qa-desktop/skills/appium-windows-driver/SKILL.md",
    # WinAppDriver — same vendor canonical install path.
    "plugins/qa-desktop/skills/winappdriver/SKILL.md",
    # Unity Hub — Unity's documented Editor install layout on Windows.
    "plugins/qa-game/skills/unity-test-framework/SKILL.md",
    # Microsoft-canonical foreground-lock registry path
    # (HKEY_CURRENT_USER\Control Panel\Desktop\ForegroundLockTimeout) cited
    # from learn.microsoft.com SetForegroundWindow docs. The registry hive
    # syntax is the documented form; a forward-slash variant would diverge
    # from Microsoft's own docs.
    "plugins/qa-desktop/skills/desktop-test-strategy-reference/SKILL.md",
}

# Body-length ceilings keyed on component TYPE (skill vs agent), not on the
# retired S1-S4 / A1-A4 archetypes. Anthropic's only published length guidance
# is "keep SKILL.md body under 500 lines" (a flat, progressive-disclosure rule;
# agents have no published cap since they run in their own context). These hard
# caps are deliberately generous absolute ceilings — "something is structurally
# wrong if exceeded" — not per-shape calibration bands.
SKILL_BODY_HARDCAP = 600
AGENT_BODY_HARDCAP = 350
SKILL_BODY_ADVISORY = 500  # Anthropic's published SKILL.md guidance

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
        is_agent = "/agents/" in p
        component_data.append({"path": p, "desc_len": desc_len, "body_lines": body_lines, "is_agent": is_agent})

        # CRITICAL: description over 1024 cap (D1 spec violation)
        if desc_len > 1024:
            findings["D1_desc_over_1024"].append({"path": p, "desc_len": desc_len})

        # CRITICAL: body over the type-based hard cap (D2 scope quality)
        cap = AGENT_BODY_HARDCAP if is_agent else SKILL_BODY_HARDCAP
        if body_lines > cap:
            findings["D2_body_over_hardcap"].append({"path": p, "body_lines": body_lines, "cap": cap})

        # CRITICAL: agent missing eval file (D7 hard reject after 2026-06-01)
        if is_agent:
            base = p[:-3]
            eval_path = os.path.join(base, "evals", "evals.md")
            alt_eval_path = base + ".evals.md"
            if not (os.path.exists(eval_path) or os.path.exists(alt_eval_path)):
                findings["D7_missing_evals"].append({"path": p})

        # IMPORTANT: Windows-style backslash paths in body (D5 hygiene / D8 sub-check 5)
        # Heuristic looks for two unambiguous Windows-path shapes inside inline
        # code or markdown link targets:
        #   1. Drive-letter prefix:  C:\Path...                  -> MATCH
        #   2. Multi-segment with CAPITALIZED names: \Foo\Bar    -> MATCH
        # The capitalized-segment requirement excludes common false positives:
        #   - regex escapes:    \bcalculate\|format       (lowercase)
        #   - psql meta-cmds:   psql -c '\dt'             (single segment)
        #   - TSV escapes:      <rule>\tIGNORE\thttps     (lowercase t)
        #   - stack-trace fmt:  \nScenario\nGiven         (lowercase n)
        # Real Windows path names (Program Files, Users, AppData, Documents,
        # Unity, etc.) follow PascalCase or Capitalized conventions; rare
        # lowercase-name false negatives (e.g., \templates\foo) are accepted
        # in exchange for clean signal on the common case.
        # Bugfix history: an earlier version used `\[a-zA-Z_]` which the regex
        # engine read as literal `[` + char-class start; D8_windows_paths was
        # silently 0 across the corpus. In raw strings `\\` = one literal
        # backslash for the regex engine.
        win_drive = re.compile(r"`[^`\n]*[A-Z]:\\[A-Za-z]")
        win_multi = re.compile(r"`[^`\n]*\\[A-Z][A-Za-z0-9_. -]*\\[A-Z]")
        link_drive = re.compile(r"\]\([^)]*[A-Z]:\\[A-Za-z]")
        link_multi = re.compile(r"\]\([^)]*\\[A-Z][A-Za-z0-9_. -]*\\[A-Z]")
        if win_drive.search(body) or win_multi.search(body) or link_drive.search(body) or link_multi.search(body):
            if p not in D8_WINDOWS_PATHS_ALLOWLIST:
                findings["D8_windows_paths"].append({"path": p})
            else:
                findings["D8_windows_paths_allowlisted"].append({"path": p})

        # ADVISORY: first-person body opener (heuristic; known to false-positive
        # on adversarial-reviewer agents). The frontmatter `description:` field
        # is the actual D3/D4 enforcement point — validate.sh catches
        # "You are…"/"I help…" there. This body-level check is retained as a
        # triage signal but NOT a violation: Anthropic's canonical code-reviewer
        # agent body opens "You are a senior code reviewer…", the established
        # pattern for adversarial-reviewer agents.
        body_start = body.strip()[:200].lower()
        if body_start.startswith("you are ") or body_start.startswith("i help ") or body_start.startswith("i am "):
            findings["D3_first_person_opener"].append({"path": p})

        # ADVISORY: multi-option paralysis signal — body lists 4+ tools/options without "Default:" / "Recommended:" / "Use [X]"
        # heuristic: find "or" lists of 3+ proper-noun-ish tokens within a small window
        option_pattern = re.compile(r"(?:[A-Z][\w-]+(?:\.[a-z]+)?(?:\s*/\s*|\s*,\s*|\s+or\s+)){3,}[A-Z][\w-]+", re.MULTILINE)
        option_hits = option_pattern.findall(body)
        if option_hits and not re.search(r"(?i)(default[:\s]|recommended[:\s]|use\s+\*\*|primary\s+choice)", body):
            findings["D8_multi_option_no_default"].append({"path": p, "sample": option_hits[0][:120]})

        # ADVISORY: body over Anthropic's "keep SKILL.md body under 500 lines"
        if body_lines > SKILL_BODY_ADVISORY and not is_agent:
            findings["D2_body_over_500"].append({"path": p, "body_lines": body_lines})

    return findings, component_data

if __name__ == "__main__":
    import sys
    import datetime

    # CI flag: when --strict (or env var D8_AUDIT_STRICT=1) is set, exit non-zero
    # if any CRITICAL or IMPORTANT-after-cutover finding is present.
    strict = ("--strict" in sys.argv) or (os.environ.get("D8_AUDIT_STRICT") == "1")

    today = datetime.date.today()
    D7_HARDGATE = datetime.date(2026, 6, 1)
    D8_HARDGATE = datetime.date(2026, 7, 1)

    findings, components = audit()
    total = len(components)
    print(f"# D8 Audit Report\n")
    print(f"**Total components scanned:** {total}  ")
    print(f"**Mode:** {'strict (CI hard-fail on critical)' if strict else 'advisory'}  ")
    print(f"**D7 hard-gate:** {D7_HARDGATE} ({'active' if today >= D7_HARDGATE else 'pending'})  ")
    print(f"**D8 hard-gate:** {D8_HARDGATE} ({'active' if today >= D8_HARDGATE else 'pending'})\n")
    print(f"## Findings by category\n")

    # Severity is computed dynamically — D7/D8 promote from advisory to critical
    # at their cutover dates per framework spec §10.
    d7_sev = "CRITICAL" if today >= D7_HARDGATE else f"ADVISORY (CRITICAL after {D7_HARDGATE})"
    d8_sev = "CRITICAL" if today >= D8_HARDGATE else f"IMPORTANT (CRITICAL after {D8_HARDGATE})"

    severity_order = [
        ("D1_desc_over_1024", "CRITICAL"),
        ("D2_body_over_hardcap", "CRITICAL"),
        ("D7_missing_evals", d7_sev),
        ("D8_windows_paths", d8_sev),
        ("D8_windows_paths_allowlisted", "INFO (vendor-canonical Windows install paths — see allowlist in d8-audit.py)"),
        ("D3_first_person_opener", "ADVISORY (adversarial-reviewer agents legitimately open \"You are…\")"),
        ("D8_multi_option_no_default", "ADVISORY"),
        ("D2_body_over_500", "ADVISORY"),
        ("UNPARSEABLE", "CRITICAL"),
    ]

    critical_count = 0
    for key, sev in severity_order:
        items = findings.get(key, [])
        print(f"### [{sev}] {key} — {len(items)} components\n")
        for it in items[:30]:
            print(f"- `{it['path']}`" + " ".join(f"({k}={v})" for k, v in it.items() if k != "path"))
        if len(items) > 30:
            print(f"- ... ({len(items)-30} more)")
        print()
        if sev.startswith("CRITICAL") and items:
            critical_count += len(items)

    if strict and critical_count > 0:
        print(f"\n[d8-audit] STRICT mode: {critical_count} critical finding(s); exiting 1")
        sys.exit(1)
    elif critical_count > 0:
        print(f"\n[d8-audit] {critical_count} critical finding(s) (advisory mode; re-run with --strict to fail)")
    else:
        print(f"\n[d8-audit] no critical findings")
