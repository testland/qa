const SCOPES = ['query:read', 'query:write', 'export:read', 'members:admin'];

export function mintToken(workspaceId, scopes) {
  if (!workspaceId) throw new Error('workspaceId required');
  for (const s of scopes) if (!SCOPES.includes(s)) throw new Error(`unknown scope ${s}`);
  return { workspaceId, scopes: [...scopes], issuedAt: '2026-09-28T00:00:00Z' };
}

export function authorise(token, workspaceId, scope) {
  if (token.workspaceId !== workspaceId) return false;
  return token.scopes.includes(scope);
}
