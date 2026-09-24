import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { useTranslation } from '../src/i18n';

export default function CartTabButton({ count, onPress }) {
  const { t } = useTranslation();

  return (
    <TouchableOpacity onPress={onPress} accessibilityLabel={t('nav.cart')}>
      <Text>{t('nav.cart')}</Text>
      <Text>{count}</Text>
    </TouchableOpacity>
  );
}
