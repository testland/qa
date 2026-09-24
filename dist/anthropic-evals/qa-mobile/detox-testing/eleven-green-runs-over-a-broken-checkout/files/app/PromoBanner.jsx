import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

// Split out of CheckoutScreen in build 392, when the banner grew a dismiss
// control and a second line of copy.
export default function PromoBanner({ error, onDismiss }) {
  if (!error) return null;

  return (
    <View testID="promo-error-banner">
      <Text testID="promo-error-message">{error.message}</Text>
      <TouchableOpacity testID="promo-error-dismiss" onPress={onDismiss}>
        <Text>Dismiss</Text>
      </TouchableOpacity>
    </View>
  );
}
