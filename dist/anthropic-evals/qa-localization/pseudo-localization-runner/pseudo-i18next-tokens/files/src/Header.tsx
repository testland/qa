import { useTranslation } from 'react-i18next';
export function Header({ user, count }: { user: { name: string }; count: number }) {
  const { t } = useTranslation();
  return (
    <header>
      <h1>{t('cart_title')}</h1>
      <span className="badge">{t('items', { count })}</span>
      <p>{t('greeting') + ', ' + user.name + '!'}</p>
      <button>Checkout</button>
    </header>
  );
}
