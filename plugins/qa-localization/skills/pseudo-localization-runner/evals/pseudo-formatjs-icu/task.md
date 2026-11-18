# Our home-made pseudo-localization breaks plurals and rich text

## Problem Description

Our home-made pseudo-localization for react-intl breaks plurals and rich text (`scripts/pseudo.js`, `lang/en.json`, `docs/notes.md`). Replace it, wire it into the app for QA, and list the localization bugs it should expose in `src/Cart.tsx`.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: scripts/pseudo.js ===============
// Builds lang/en-XA.json for QA from the extracted English messages.
const fs = require('fs');
const map = { a: 'à', e: 'é', i: 'î', o: 'ô', u: 'û', c: 'ç', n: 'ñ', s: 'š', t: 'ţ', y: 'ý' };
const en = JSON.parse(fs.readFileSync('lang/en.json', 'utf8'));
const out = {};
for (const [id, msg] of Object.entries(en)) {
  out[id] = { defaultMessage: msg.defaultMessage.replace(/[aeioucnsty]/g, (ch) => map[ch]) + ' ~~~' };
}
fs.writeFileSync('lang/en-XA.json', JSON.stringify(out, null, 2));

=============== FILE: lang/en.json ===============
{
  "cart.count": {
    "defaultMessage": "{count, plural, one {# item} other {# items}} in your cart"
  },
  "cart.terms": {
    "defaultMessage": "I accept the <link>terms of sale</link>"
  },
  "cart.greeting": {
    "defaultMessage": "Hi {name}"
  }
}

=============== FILE: src/Cart.tsx ===============
import { FormattedMessage, useIntl } from 'react-intl';

export function Cart({ count, name }: { count: number; name: string }) {
  const intl = useIntl();
  return (
    <aside>
      <h2>{intl.formatMessage({ id: 'cart.greeting', defaultMessage: 'Hi {name}' }, { name }) + '!'}</h2>
      <p><FormattedMessage id="cart.count" defaultMessage="{count, plural, one {# item} other {# items}} in your cart" values={{ count }} /></p>
      <label><input type="checkbox" /> <FormattedMessage id="cart.terms" defaultMessage="I accept the <link>terms of sale</link>"
        values={{ link: (c) => <a href="/terms">{c}</a> }} /></label>
      <button style={{ width: 96 }}>Checkout</button>
    </aside>
  );
}

=============== FILE: docs/notes.md ===============
- Messages are extracted with `formatjs extract 'src/**/*.tsx' --out-file lang/en.json`. App uses react-intl.
- With lang/en-XA.json loaded, the cart crashes ("FORMAT_ERROR" / "Expected 'plural'") and the terms link disappears.
- We'd also like to catch right-to-left problems before we add Arabic next quarter.
