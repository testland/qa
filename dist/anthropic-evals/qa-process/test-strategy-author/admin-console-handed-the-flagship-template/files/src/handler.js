import { issueRefund } from './refunds.js';
import { append } from './action-log.js';
import { submitToProvider } from './provider.js';

export async function handleRefund(ctx, req) {
  const refund = issueRefund(ctx.agent, req.order, req.amountCents);
  const receipt = await submitToProvider(refund);
  append(ctx.log, {
    agentId: ctx.agent.id,
    orderId: req.order.id,
    amountCents: req.amountCents,
    providerRef: receipt.ref,
  });
  return receipt;
}
