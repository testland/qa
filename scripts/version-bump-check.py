#!/usr/bin/env python3
"""scripts/version-bump-check.py — flag plugins changed without a version bump.

Guards against the "silent no-update" trap. Claude Code resolves a plugin's
version from the first of: plugin.json `version`, the marketplace entry
`version`, then the git commit SHA. When `version` is set in plugin.json,
pushing new commits *without changing that string does nothing for existing
users* — Claude Code sees the same version and keeps the cached copy. So if a
plugin's shipped files change but `plugins/<name>/.claude-plugin/plugin.json`
`version` stays the same, users never receive the update.

This is the local mirror of the PR gate in
`.github/workflows/version-bump.yml`, so contributors can catch the problem
before pushing instead of waiting for CI.

Usage:
  python3 scripts/version-bump-check.py [BASE [HEAD]]

    BASE   git ref for the "before" side. Default: origin/main if it
           resolves, else HEAD.
    HEAD   git ref for the "after" side. Default: the working tree
           (so uncommitted edits count).

Exit codes:
  0  ok — every touched plugin bumped its version (or is new / unversioned)
  1  at least one plugin changed without a version bump
  2  setup error (git diff failed, etc.)

Plugins with no `version` field at all are skipped: they are intentionally
SHA-versioned, so every commit already reaches users on the next refresh.
Brand-new plugins (no version at BASE) are skipped too.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys

PLUGIN_DIR_RE = re.compile(r"^(plugins/[^/]+)/")


def git(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(["git", *args], capture_output=True, text=True)


def resolve_base(explicit: str | None) -> str:
    if explicit:
        return explicit
    if git("rev-parse", "--verify", "--quiet", "origin/main").returncode == 0:
        return "origin/main"
    return "HEAD"


def version_at(ref: str | None, path: str) -> str | None:
    """`version` of plugin.json at a ref, or None if the file/field is absent.

    ref=None reads the working-tree file.
    """
    if ref is None:
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
        except (OSError, json.JSONDecodeError):
            return None
    else:
        r = git("show", f"{ref}:{path}")
        if r.returncode != 0:
            return None
        try:
            data = json.loads(r.stdout)
        except json.JSONDecodeError:
            return None
    v = data.get("version")
    return str(v) if v is not None else None


def main() -> int:
    base = resolve_base(sys.argv[1] if len(sys.argv) > 1 else None)
    head = sys.argv[2] if len(sys.argv) > 2 else None  # None => working tree

    if git("rev-parse", "--is-inside-work-tree").returncode != 0:
        print("version-bump-check: not a git repository; skipping")
        return 0

    diff_args = ["diff", "--name-only", base]
    if head:
        diff_args.append(head)
    diff_args += ["--", "plugins"]
    r = git(*diff_args)
    if r.returncode != 0:
        print(f"version-bump-check: git diff failed ({r.stderr.strip()})", file=sys.stderr)
        return 2

    changed = [ln for ln in r.stdout.splitlines() if ln.strip()]
    if not head:  # include untracked new files when comparing the working tree
        u = git("ls-files", "--others", "--exclude-standard", "--", "plugins")
        changed += [ln for ln in u.stdout.splitlines() if ln.strip()]

    touched = sorted(
        {m.group(1) for ln in changed if (m := PLUGIN_DIR_RE.match(ln))}
    )
    if not touched:
        print(f"version-bump-check: no plugin files changed vs {base}; nothing to enforce")
        return 0

    fail = 0
    for plugin in touched:
        manifest = f"{plugin}/.claude-plugin/plugin.json"
        before = version_at(base, manifest)
        after = version_at(head, manifest)
        if before is None:
            print(f"  new plugin (no base version): {plugin} — skipping")
            continue
        if after is None:
            print(f"  unversioned plugin (SHA-based updates reach users): {plugin} — skipping")
            continue
        if before == after:
            print(
                f"FAIL ({manifest}): version not bumped (still {before}); "
                f"bump it when changing files inside {plugin}/"
            )
            fail = 1
        else:
            print(f"  OK: {plugin} {before} -> {after}")

    if not fail:
        print("version-bump-check: all touched plugins bumped their version")
    return fail


if __name__ == "__main__":
    sys.exit(main())
