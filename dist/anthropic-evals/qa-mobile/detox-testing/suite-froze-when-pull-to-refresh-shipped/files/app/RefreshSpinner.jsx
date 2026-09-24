import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

export default function RefreshSpinner({ refreshing }) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View testID="refresh-spinner" style={{ opacity: refreshing ? 1 : 0 }}>
      <Animated.Image source={require('../assets/spinner.png')} style={{ transform: [{ rotate }] }} />
    </View>
  );
}
