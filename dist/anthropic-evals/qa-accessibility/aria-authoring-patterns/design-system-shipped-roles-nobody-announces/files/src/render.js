import { readFileSync } from 'node:fs';

const TOKENS = JSON.parse(readFileSync(new URL('../tokens/roles.json', import.meta.url), 'utf8'));

export function attrsFor(component, state = {}) {
  const token = TOKENS[component];
  if (!token) throw new Error('unknown component: ' + component);
  const attrs = {};
  if (token.role) attrs.role = token.role;
  if (token.state) attrs[token.state] = String(state.value);
  if (state.controls) attrs['aria-controls'] = state.controls;
  return attrs;
}

export function renderCollapsible(open, regionId) {
  return {
    trigger: { tag: 'button', text: 'Shipping options', ...attrsFor('collapsible', { value: open, controls: regionId }) },
    region: { tag: 'div', id: regionId, hidden: !open },
  };
}

export function renderCounter(count) {
  return {
    minus: { tag: 'button', 'aria-label': 'Decrease quantity' },
    field: { tag: 'div', text: String(count), ...attrsFor('counter', { value: count }) },
    plus: { tag: 'button', 'aria-label': 'Increase quantity' },
  };
}

export function renderMenuTrigger(open, menuId) {
  return {
    trigger: { tag: 'button', text: 'Account', ...attrsFor('menu-trigger', { value: open, controls: menuId }) },
    menu: {
      tag: 'ul',
      id: menuId,
      hidden: !open,
      items: [
        { tag: 'li', link: { tag: 'a', href: '/profile', text: 'Profile' } },
        { tag: 'li', link: { tag: 'a', href: '/billing', text: 'Billing' } },
        { tag: 'li', link: { tag: 'a', href: '/logout', text: 'Sign out' } },
      ],
    },
  };
}

export function renderToggle(on) {
  return {
    control: { tag: 'button', text: 'Email digest', ...attrsFor('toggle', { value: on }) },
  };
}

export function renderHint(bubbleId, text) {
  return {
    trigger: { tag: 'button', text: 'Save' },
    bubble: { tag: 'div', id: bubbleId, text, hidden: true, ...attrsFor('hint') },
  };
}
