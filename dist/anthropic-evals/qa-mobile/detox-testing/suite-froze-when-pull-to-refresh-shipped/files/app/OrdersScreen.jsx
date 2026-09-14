import React, { useState } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import RefreshSpinner from './RefreshSpinner';
import OrderRow from './OrderRow';

export default function OrdersScreen({ orders, onRefresh }) {
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  return (
    <View testID="orders-screen">
      <RefreshSpinner refreshing={refreshing} />
      <FlatList
        testID="orders-list"
        data={orders}
        keyExtractor={(o) => String(o.id)}
        renderItem={({ item }) => <OrderRow order={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      />
    </View>
  );
}
