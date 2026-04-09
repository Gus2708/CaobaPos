import React, { memo } from 'react';
import { Text, TouchableOpacity, StyleSheet, Image, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Product } from '../store/cartStore';
import { FontNames } from '../lib/fontNames';

interface ProductButtonProps {
  product: Product;
  onPress: () => void;
}

function ProductButtonComponent({ product, onPress }: ProductButtonProps) {
  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress} 
      activeOpacity={0.75}
      accessibilityLabel={`${product.name}, $${product.price.toFixed(2)}`}
      accessibilityRole="button"
    >
      <LinearGradient
        colors={['rgba(184, 123, 90, 0.15)', 'rgba(30, 30, 36, 0.3)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.innerBorder} />
      
      <View style={styles.imageContainer}>
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <LinearGradient
              colors={['rgba(184, 123, 90, 0.3)', 'rgba(184, 123, 90, 0.1)']}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.placeholderText}>
              {product.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.imageOverlay} />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={styles.priceContainer}>
          <Text style={styles.currency}>$</Text>
          <Text style={styles.price}>{product.price.toFixed(2)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const ProductButton = memo(ProductButtonComponent, (prevProps, nextProps) => {
  return prevProps.product.id === nextProps.product.id && 
         prevProps.product.name === nextProps.product.name &&
         prevProps.product.price === nextProps.product.price;
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(30, 30, 36, 0.6)',
    borderRadius: 24,
    padding: 16,
    minHeight: 172,
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  innerBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  imageContainer: {
    width: 72,
    height: 72,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 12,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#B87B5A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 36, 0.8)',
    position: 'relative',
  },
  placeholderText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 28,
    fontWeight: '700',
    color: '#B87B5A',
    textShadowColor: 'rgba(184, 123, 90, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 18,
  },
  content: {
    alignItems: 'center',
    flex: 1,
  },
  name: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 13,
    fontWeight: '600',
    color: '#F0F0F2',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.3,
    lineHeight: 18,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(184, 123, 90, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.3)',
  },
  currency: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: 12,
    fontWeight: '600',
    color: '#B87B5A',
    marginRight: 2,
  },
  price: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: 16,
    fontWeight: '700',
    color: '#B87B5A',
  },
});
