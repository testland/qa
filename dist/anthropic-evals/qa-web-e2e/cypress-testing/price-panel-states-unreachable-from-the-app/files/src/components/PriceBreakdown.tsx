export type Money = { amount: number; currency: 'USD' | 'EUR' | 'GBP' };

export type PriceBreakdownProps = {
  status: 'loading' | 'error' | 'ready';
  items?: number;
  subtotal?: Money;
  tax?: Money | null;
  discount?: Money;
  onRetry?: () => void;
};

const format = ({ amount, currency }: Money) =>
  new Intl.NumberFormat('en', { style: 'currency', currency }).format(amount);

export function PriceBreakdown({
  status,
  items = 0,
  subtotal,
  tax,
  discount,
  onRetry,
}: PriceBreakdownProps) {
  if (status === 'loading') return <p role="status">Calculating your total</p>;

  if (status === 'error')
    return (
      <div role="alert">
        <p>We could not price this order.</p>
        <button onClick={onRetry}>Try again</button>
      </div>
    );

  if (items === 0) return <p data-testid="empty-breakdown">Your cart is empty</p>;

  const total =
    (subtotal?.amount ?? 0) + (tax?.amount ?? 0) - (discount?.amount ?? 0);

  return (
    <dl data-testid="price-breakdown">
      <dt>Subtotal</dt>
      <dd>{subtotal ? format(subtotal) : '-'}</dd>
      {discount && (
        <>
          <dt>Discount</dt>
          <dd data-testid="discount">-{format(discount)}</dd>
        </>
      )}
      <dt>Tax</dt>
      <dd data-testid="tax">{tax === null ? 'Tax exempt' : tax ? format(tax) : '-'}</dd>
      <dt>Total</dt>
      <dd data-testid="total">
        {format({ amount: total, currency: subtotal?.currency ?? 'USD' })}
      </dd>
    </dl>
  );
}
