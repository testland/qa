'use strict';

const NAV = '<nav><a href="/">Home</a><a href="/pricing">Pricing</a><a href="/checkout">Cart</a></nav>';

function renderHome() {
  return `<!doctype html><title>Parcelo</title>${NAV}<h1>Deliveries that land when you said they would</h1><p class="lede">Book a courier in under a minute.</p><a class="btn btn--primary btn--lg" href="/pricing">See plans</a>`;
}

function renderPricing() {
  return `<!doctype html><title>Plans</title>${NAV}<h1>Plans that grow with you</h1><ul class="tiers"><li data-tier="starter">Starter<span class="price">£19</span></li><li data-tier="team">Team<span class="price">£49</span></li></ul>`;
}

function renderCheckout(cart) {
  const pence = cart.items.reduce((n, i) => n + i.price * i.qty, 0);
  return `<!doctype html><title>Checkout</title>${NAV}<h1>Almost there</h1><span data-testid="cart-total">£${(pence / 100).toFixed(2)}</span><button id="place-order" class="btn btn--primary btn--lg">Place order</button>`;
}

function renderConfirmation(order) {
  return `<!doctype html><title>Thanks</title>${NAV}<h1>Thanks, your courier is booked</h1><p>Order #${order.reference || ''}</p><p>A receipt is on its way to your inbox.</p>`;
}

function handle(path, ctx = {}) {
  if (path === '/') return { status: 200, html: renderHome() };
  if (path === '/pricing') return { status: 200, html: renderPricing() };
  if (path === '/checkout') return { status: 200, html: renderCheckout(ctx.cart || { items: [] }) };
  if (path === '/order/confirmation') return { status: 200, html: renderConfirmation(ctx.order || {}) };
  return { status: 404, html: '<!doctype html><title>Not found</title><h1>We cannot find that page</h1>' };
}

module.exports = { handle };
