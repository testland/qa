import React from 'react';
import { View, Image } from 'react-native';
import NativeDateTimePicker from '@vendor/rn-datetime';
import { useTranslation } from '../src/i18n';

export default function DeliveryDateField({ value, onChange }) {
  const { t, locale } = useTranslation();

  return (
    <View>
      <View>
        <NativeDateTimePicker
          mode="date"
          locale={locale}
          value={value}
          onChange={onChange}
          accessibilityLabel={t('checkout.deliveryDate')}
        />
      </View>

      {value ? (
        <Image
          source={require('../assets/date-confirmed.png')}
          accessibilityLabel={t('checkout.dateChosen')}
        />
      ) : null}
    </View>
  );
}
