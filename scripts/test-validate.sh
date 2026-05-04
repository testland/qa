#!/usr/bin/env bash
# scripts/test-validate.sh
# Harness test for scripts/validate.sh.
# Builds a fixture tree with one valid and several invalid components,
# runs validate.sh against it, and verifies that every invalid component
# is flagged. Exit 0 = pass, non-zero = fail.

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VALIDATE="$REPO_ROOT/scripts/validate.sh"

FIXTURES=$(mktemp -d 2>/dev/null || mktemp -d -t 'tlqa-fixtures')
trap 'rm -rf "$FIXTURES"' EXIT

# ----- Fixture: valid skill -----
mkdir -p "$FIXTURES/plugins/test-plugin/skills/valid-name"
cat > "$FIXTURES/plugins/test-plugin/skills/valid-name/SKILL.md" <<'EOF'
---
name: valid-name
description: Demonstrates kebab-case naming and a third-person, action-oriented description that distinguishes itself from the other fixtures used by the validate.sh harness.
rating: 22
archetype: S1
---
# Body
Valid body content.
EOF

# Fixture: minimal valid plugin.json so JSON-syntax check sees a file
mkdir -p "$FIXTURES/plugins/test-plugin/.claude-plugin"
cat > "$FIXTURES/plugins/test-plugin/.claude-plugin/plugin.json" <<'EOF'
{ "name": "test-plugin", "version": "0.1.0" }
EOF

# ----- Fixture: invalid name (uppercase + underscore) -----
mkdir -p "$FIXTURES/plugins/test-plugin/skills/Invalid_Name"
cat > "$FIXTURES/plugins/test-plugin/skills/Invalid_Name/SKILL.md" <<'EOF'
---
name: Invalid_Name
description: Should fail validation due to upper-case letters and underscore.
---
EOF

# ----- Fixture: reserved word in name -----
mkdir -p "$FIXTURES/plugins/test-plugin/skills/claude-helper"
cat > "$FIXTURES/plugins/test-plugin/skills/claude-helper/SKILL.md" <<'EOF'
---
name: claude-helper
description: Should fail because the name contains the reserved word claude.
---
EOF

# ----- Fixture: generic role-agent name -----
mkdir -p "$FIXTURES/plugins/test-plugin/agents"
cat > "$FIXTURES/plugins/test-plugin/agents/qa-expert.md" <<'EOF'
---
name: qa-expert
description: Generic role agent that should be rejected by the lint rules.
---
Body.
EOF

# ----- Fixture: "You are..." description -----
cat > "$FIXTURES/plugins/test-plugin/agents/persona-agent.md" <<'EOF'
---
name: persona-agent
description: You are a helpful test assistant that should fail validation.
---
Body.
EOF

# ----- Fixture: empty command body -----
mkdir -p "$FIXTURES/plugins/test-plugin/commands"
cat > "$FIXTURES/plugins/test-plugin/commands/empty-cmd.md" <<'EOF'
---
name: empty-cmd
description: Command with empty body should fail.
---
EOF

# ----- Fixture: literal placeholder string -----
mkdir -p "$FIXTURES/plugins/test-plugin/skills/has-placeholder"
cat > "$FIXTURES/plugins/test-plugin/skills/has-placeholder/SKILL.md" <<'EOF'
---
name: has-placeholder
description: A skill that still contains DESCRIPTION_PLACEHOLDER inside its body.
---
DESCRIPTION_PLACEHOLDER
EOF

# Run validate.sh against the fixtures and capture output.
set +e
OUTPUT=$(bash "$VALIDATE" "$FIXTURES" 2>&1)
STATUS=$?
set -e

FAIL=0
expect_in_output() {
  local needle="$1"
  if ! echo "$OUTPUT" | grep -q "$needle"; then
    echo "FAIL: expected to see '$needle' in validate output"
    FAIL=1
  fi
}

expect_in_output "Invalid_Name"
expect_in_output "claude-helper"
expect_in_output "qa-expert"
expect_in_output "persona-agent"
expect_in_output "empty-cmd"
expect_in_output "has-placeholder"

if [[ "$STATUS" -eq 0 ]]; then
  echo "FAIL: validate.sh exited 0 but fixtures contain known violations"
  FAIL=1
fi

if [[ "$FAIL" -ne 0 ]]; then
  echo "----- validate.sh output -----"
  echo "$OUTPUT"
  echo "------------------------------"
  exit 1
fi

echo "PASS: validate.sh detected all expected violations"
