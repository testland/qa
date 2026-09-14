// Stubbed for tests; the deployed build binds this to the provider SDK.
export async function submitToProvider(refund) {
  return { ref: `pr_${refund.orderId}`, status: 'accepted', amountCents: refund.amountCents };
}
