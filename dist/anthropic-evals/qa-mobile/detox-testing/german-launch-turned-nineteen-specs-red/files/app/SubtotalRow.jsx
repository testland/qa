import React from 'react';
import { View, Text } from 'react-native';
import { formatMoney } from '../src/format-money';
import { useTranslation } from '../src/i18n';

export default function SubtotalRow({ cents }) {
  const { t, locale } = useTranslation();

  return (
    <View>
      <Text>{t('checkout.subtotal')}</Text>
      <Text>{formatMoney(cents, locale)}</Text>
    </View>
  );
}
