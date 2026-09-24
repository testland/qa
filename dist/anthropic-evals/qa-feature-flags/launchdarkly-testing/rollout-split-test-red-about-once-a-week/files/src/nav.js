'use strict';

async function navVariant(client, user) {
  const redesign = await client.variation('nav-redesign', user, false);
  if (!redesign) return { shell: 'classic', items: 7 };
  return { shell: 'redesign', items: user.plan === 'free' ? 5 : 9 };
}

function navItemLabel(item) {
  return item.label.trim().replace(/\s+/g, ' ');
}

module.exports = { navVariant, navItemLabel };
