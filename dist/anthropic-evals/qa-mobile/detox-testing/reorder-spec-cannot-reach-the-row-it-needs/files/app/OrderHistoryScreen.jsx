import React from 'react';
import { FlatList, View } from 'react-native';
import OrderRow from './OrderRow';
import { sortOrders } from '../src/order-history';

export default function OrderHistoryScreen({ orders, onOpen }) {
  return (
    <View testID="order-history-screen">
      <FlatList
        testID="order-history-list"
        data={sortOrders(orders)}
        keyExtractor={(o) => String(o.id)}
        renderItem={({ item }) => <OrderRow order={item} onOpen={onOpen} />}
      />
    </View>
  );
}
