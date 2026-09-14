import React, { useEffect, useRef } from 'react';
import { Animated, Text } from 'react-native';

export default function CartBadge({ count }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.3, duration: 120, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [count, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Text testID="cart-count">{count}</Text>
    </Animated.View>
  );
}
