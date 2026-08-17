# Five of the six price panel states are untestable from the app

## Problem Description

`PriceBreakdown` renders six different things depending on what the pricing
service returns: a calculating state, a failure state with a retry button, an
empty cart, a tax-exempt order, a discounted order, and an order priced in a
currency other than dollars.

The only coverage is `cypress/e2e/checkout.cy.ts`, which walks the whole store
to reach exactly one of them - a plain dollar order with tax. To reach the other
five from the browser we would need a tax-exempt customer record, a live
discount code, a euro price list, and a way to make the pricing service fail on
demand. Two of those do not exist outside production. The empty and failure
states have each shipped broken in the last year.

We want the six states covered by tests that render the panel on its own with
the props that produce each state - no server, no sign-in, no navigation. It has
to run under the tooling we already have and be startable from CI next to the
existing suite; we are not introducing a second test framework or a second
runner to the repository.

One constraint from a previous attempt: whoever tried this last added a helper
for rendering the panel and reached it through a cast, which our type check
rejects. CI runs `tsc --noEmit` over the test sources, and neither casts nor
suppression comments will get through review.

## Output Specification

1. Tests covering all six states, each rendering `PriceBreakdown` directly with
   the props for that state and asserting what the user sees, including that the
   retry button in the failure state calls the callback it is given.
2. `cypress.config.ts` extended so that mode can start, with the dev server
   settings that match this project.
3. Those specs kept separate from the browser-flow specs, with their own spec
   pattern and their own support file.
4. A `package.json` script so CI can run the new mode alongside the existing
   `e2e` script.
5. The render helper must be reachable from the same command object the rest of
   the tests use, and must type-check with no casts and no suppression comments.
6. `src/components/PriceBreakdown.tsx` and `cypress/e2e/checkout.cy.ts` must not
   change, and no additional test framework may be added.

## Input Files

Extract the following files before beginning.

=============== FILE: src/components/PriceBreakdown.tsx ===============
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

=============== FILE: cypress/e2e/checkout.cy.ts ===============
describe('Checkout', () => {
  it('prices a dollar order with tax', () => {
    cy.visit('/products/BOOK-001');
    cy.findByRole('button', { name: /add to cart/i }).click();
    cy.visit('/checkout');
    cy.findByTestId('total').should('have.text', '$41.98');
  });
});

=============== FILE: cypress.config.ts ===============
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    retries: { runMode: 2, openMode: 0 },
  },
});

=============== FILE: cypress/support/commands.ts ===============
import '@testing-library/cypress/add-commands';

=============== FILE: cypress/support/e2e.ts ===============
import './commands';

=============== FILE: package.json ===============
{
  "name": "storefront",
  "private": true,
  "scripts": {
    "dev": "vite",
    "typecheck": "tsc --noEmit",
    "e2e": "cypress run"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/cypress": "^10.0.2",
    "@vitejs/plugin-react": "^4.3.4",
    "cypress": "^13.15.0",
    "typescript": "^5.6.3",
    "vite": "^5.4.11"
  }
}
