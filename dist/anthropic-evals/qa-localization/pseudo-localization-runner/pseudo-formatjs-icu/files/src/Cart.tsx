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
