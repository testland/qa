# GitHub Issues deep reference

Deep reference for `github-issues-bug-workflow` SKILL.md. Consult when moving an
issue across a Projects v2 status column (GraphQL), scripting the workflow with
the gh CLI, or wiring GitHub Actions to file an issue on test failure.

## Parsing results

Create response includes `number` (per-repo), `html_url`
(permalink), `node_id` (GraphQL ID for Projects v2 cross-ref).

Search response includes `items` array (issues + PRs), `total_count`,
`incomplete_results` (set to `true` on partial results due to
rate limit).

## Projects v2 status updates

For richer state (e.g., a Kanban with custom columns), Projects
v2 requires GraphQL - the REST API doesn't reach Projects v2:

```python
PROJECTS_MUTATION = """
mutation MoveItem($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
  updateProjectV2ItemFieldValue(
    input: { projectId: $projectId, itemId: $itemId,
             fieldId: $fieldId, value: { singleSelectOptionId: $optionId } }
  ) { projectV2Item { id } }
}
"""
# Discovery of projectId, itemId, fieldId, optionId via the matching queries.
```

Per docs.github.com/en/issues/planning-and-tracking-with-projects.

## gh CLI for scripts

The `gh` CLI handles auth via the user's stored credentials, so scripted
workflows skip token wiring (per cli.github.com/manual/gh_issue):

```bash
# Create
gh issue create \
  --title "Checkout fails for promo X" \
  --body-file failure.md \
  --label bug,severity:high,priority:p2

# Close with reason
gh issue close 1234 --reason completed
gh issue close 1234 --reason "not planned"

# Search
gh issue list --search 'is:open label:bug "checkout fails"'
```

## CI integration

```yaml
# .github/workflows/test.yml
- name: Run tests
  id: tests
  run: pytest --junitxml=results.xml
  continue-on-error: true

- name: File issue on test failure
  if: steps.tests.outcome == 'failure'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    GITHUB_REPO: ${{ github.repository }}
  run: python scripts/file-github-bug.py results.xml
```

Use the auto-provided `GITHUB_TOKEN` for in-repo automation; for
cross-repo, use a fine-grained PAT.
