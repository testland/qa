'use strict';

const TAB_ORDER = ['email', 'password', 'remember me', 'Sign in'];

function createPage() {
  const fields = {};
  let route = '/signin';
  let flash = '';
  let session = null;
  let cart = [];
  let focusIndex = -1;

  return {
    goto(path) {
      route = path;
    },
    fill(label, value) {
      fields[label] = value;
    },
    check(label) {
      fields[label] = true;
    },
    click(label) {
      if (label === 'Sign in') {
        const ok = fields.email === 'ada@example.test' && fields.password === 'correct-horse';
        session = ok ? { email: fields.email, remembered: fields['remember me'] === true } : null;
        route = ok ? '/dashboard' : '/signin';
        flash = ok ? 'Welcome back' : 'Those credentials did not match';
      } else if (label === 'Add to cart') {
        cart.push({ sku: 'BOOK-001', qty: 1 });
        flash = 'Added to cart';
      } else if (label === 'Place order') {
        if (!session) {
          flash = 'Please sign in';
          return;
        }
        route = '/orders/ord-1';
        flash = `Order confirmed for ${cart.length} item(s)`;
        cart = [];
      }
    },
    press(key) {
      if (key === 'Tab') {
        focusIndex = (focusIndex + 1) % TAB_ORDER.length;
      }
    },
    focused: () => (focusIndex < 0 ? null : TAB_ORDER[focusIndex]),
    route: () => route,
    flash: () => flash,
    signedIn: () => session !== null,
    cartCount: () => cart.length,
  };
}

module.exports = { createPage };
