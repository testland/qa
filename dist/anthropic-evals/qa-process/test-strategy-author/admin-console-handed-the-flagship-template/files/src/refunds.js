const CAP_CENTS = 50_000;

export function issueRefund(agent, order, amountCents, alreadyRefunded = new Set()) {
  if (!agent || agent.role !== 'support') throw new Error('not authorised');
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error('amountCents must be a positive integer');
  }
  if (amountCents > order.totalCents) throw new Error('refund exceeds order total');
  if (amountCents > CAP_CENTS) throw new Error('above the agent cap');
  if (alreadyRefunded.has(order.id)) throw new Error('order already refunded');
  return { orderId: order.id, amountCents, agentId: agent.id, status: 'submitted' };
}
