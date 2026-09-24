import React from 'react';
import { View, Text } from 'react-native';
import VendorMapView from '@vendor/rn-livemap';

export default function LiveMapScreen({ courier, etaMinutes }) {
  return (
    <View testID="tracking-map">
      <VendorMapView courier={courier} followCourier />
      <Text testID="courier-eta">{etaMinutes} min</Text>
    </View>
  );
}
