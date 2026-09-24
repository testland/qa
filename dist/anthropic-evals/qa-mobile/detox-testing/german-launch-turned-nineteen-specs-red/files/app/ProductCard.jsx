import React from 'react';
import { TouchableOpacity, Text, Image, View } from 'react-native';
import { useTranslation } from '../src/i18n';

export default function ProductCard({ product, onAdd }) {
  const { t } = useTranslation();

  return (
    <View>
      <TouchableOpacity onPress={() => onAdd(product.sku)}>
        <Text>{product.name}</Text>
      </TouchableOpacity>

      {product.organic ? (
        <Image source={require('../assets/organic-badge.png')} accessibilityLabel={t('badge.organic')} />
      ) : null}

      {product.inStock ? (
        <TouchableOpacity onPress={() => onAdd(product.sku)}>
          <Text>{t('catalogue.addToCart')}</Text>
        </TouchableOpacity>
      ) : (
        <Text>{t('catalogue.outOfStock')}</Text>
      )}
    </View>
  );
}
