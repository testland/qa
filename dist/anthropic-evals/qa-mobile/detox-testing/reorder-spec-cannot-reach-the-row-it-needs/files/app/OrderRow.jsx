import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { formatMoney } from '../src/format-money';

export default function OrderRow({ order, onOpen, onReorder }) {
  return (
    <TouchableOpacity
      testID="order-row"
      onPress={() => onOpen(order.id)}
      onLongPress={() => onReorder(order.id)}
    >
      <View>
        <Text testID="order-row-date">{order.placedAt}</Text>
        <Text testID="order-row-total">{formatMoney(order.totalCents, order.locale)}</Text>
      </View>
    </TouchableOpacity>
  );
}
