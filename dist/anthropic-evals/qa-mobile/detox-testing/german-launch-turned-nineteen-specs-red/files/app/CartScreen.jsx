import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import SubtotalRow from './SubtotalRow';
import { useTranslation } from '../src/i18n';

export default function CartScreen({ subtotalCents, onCheckout }) {
  const { t } = useTranslation();

  return (
    <View>
      <SubtotalRow cents={subtotalCents} />
      <TouchableOpacity onPress={onCheckout}>
        <Text>{t('cart.checkout')}</Text>
      </TouchableOpacity>
    </View>
  );
}
