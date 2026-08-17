# The checkout tests read like a macro recording

## Problem Description

`src/checkout.test.js` drives our fake browser directly. Every test body is a
run of `goto` / `fill` / `check` / `click` calls, and to answer "what does this
test prove?" you have to replay the sequence in your head and remember that
`click('Sign in')` after two `fill` calls means a customer signed in.

The product owner sat with us last week and could not follow a single test.
When the sign-in form was reworked in the spring, the same run of calls had to
be edited by hand in every test that signs in, even though no behaviour had
changed.

Two things about the file should not be flattened out. The long test is one
customer journey on purpose - sign in, add a book, order it - and we want it to
stay one test rather than three disconnected ones. And the last test is about
the tab order of the sign-in form itself: the sequence of key presses is the
thing under test, so it has to keep showing them, and the next person to tidy
this file needs to be able to tell that at a glance.

## Output Specification

1. Rework `src/checkout.test.js` so each test body reads as a short run of
   named steps at the level a product owner would describe them, and so that
   reworking the sign-in form again would touch one place in the file.
2. The browser-level calls must still happen - move them, do not remove them.
   Every assertion that exists today must still exist, with the same expected
   values.
3. The customer journey stays one test.
4. The tab-order test must still show its key presses, and must carry
   something that tells the next reader it is meant to stay that way.
5. Produce `journey-review.md` listing the steps you introduced and what each
   one does.

Do not change `src/browser.js`.

Run `npm test` before you finish; it must pass.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "storefront",
  "version": "6.0.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/browser.js ===============
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

=============== FILE: src/checkout.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createPage } = require('./browser');

test('checkout', () => {
  const page = createPage();
  page.goto('/signin');
  page.fill('email', 'ada@example.test');
  page.fill('password', 'correct-horse');
  page.check('remember me');
  page.click('Sign in');
  assert.equal(page.route(), '/dashboard');
  page.goto('/products/book-001');
  page.click('Add to cart');
  assert.equal(page.cartCount(), 1);
  page.goto('/cart');
  page.click('Place order');
  assert.equal(page.route(), '/orders/ord-1');
  assert.equal(page.flash(), 'Order confirmed for 1 item(s)');
});

test('bad password', () => {
  const page = createPage();
  page.goto('/signin');
  page.fill('email', 'ada@example.test');
  page.fill('password', 'nope');
  page.check('remember me');
  page.click('Sign in');
  assert.equal(page.signedIn(), false);
  assert.equal(page.flash(), 'Those credentials did not match');
});

test('order without signing in', () => {
  const page = createPage();
  page.goto('/products/book-001');
  page.click('Add to cart');
  page.goto('/cart');
  page.click('Place order');
  assert.equal(page.flash(), 'Please sign in');
  assert.equal(page.cartCount(), 1);
});

test('tab order', () => {
  const page = createPage();
  page.goto('/signin');
  page.press('Tab');
  assert.equal(page.focused(), 'email');
  page.press('Tab');
  assert.equal(page.focused(), 'password');
  page.press('Tab');
  assert.equal(page.focused(), 'remember me');
  page.press('Tab');
  assert.equal(page.focused(), 'Sign in');
});
