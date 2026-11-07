# Agent browser for a monorepo

## Problem Description

Claude Code works in a large monorepo all day. Now and then it needs to open a
staging page to check a UI change it just made. A colleague proposes adding the
Playwright MCP server for that. The team also wants generated E2E tests later,
using Playwright's own agents.

## Output Specification

Write `browser-setup.md` with a recommendation for the occasional page checks
and the exact setup commands, then the setup for Playwright's test-writing
agents, including what has to happen when Playwright is upgraded.
