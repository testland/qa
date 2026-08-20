export async function notifyOwner(token, send) {
  if (!token || !token.userId) throw new Error('token has no owner');

  const receipt = await send(token.userId, `session ${token.id}`);
  return { delivered: true, receipt };
}
