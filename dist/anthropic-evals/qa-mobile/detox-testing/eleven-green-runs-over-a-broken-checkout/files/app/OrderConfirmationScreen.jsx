import React from 'react';
import { View, Text } from 'react-native';

export default function OrderConfirmationScreen({ order }) {
  // Throws since build 401: the API now sends `referenceCode`, so `reference`
  // is undefined and `.toUpperCase()` blows up during render. Fix in review.
  const ref = order.reference.toUpperCase();

  return (
    <View testID="order-confirmation">
      <Text testID="order-reference">{ref}</Text>
      <Text testID="delivery-window">{order.deliveryWindow}</Text>
    </View>
  );
}
