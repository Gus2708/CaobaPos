import React, { memo, useRef, useCallback } from 'react';
import { Text, TouchableOpacity, StyleSheet, Image, View, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Product } from '../store/cartStore';
import { FontNames } from '../lib/fontNames';
import { tokens } from '../lib/designTokens';
import { Icon } from './Icon';

interface ProductButtonProps {
  product: Product;
  onPress: () => void;
  compact?: boolean;  // tablet grid mode: vertical card
}

function ProductButtonComponent({ product, onPress, compact = false }: ProductButtonProps) {
  const isLowStock = product.stock_quantity < 5;
  const isOutOfStock = product.stock_quantity <= 0;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    if (isOutOfStock) return;
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
        ...tokens.animation.spring,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1.03,
        useNativeDriver: true,
        ...tokens.animation.springBounce,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        ...tokens.animation.spring,
      }),
    ]).start();
    onPress();
  }, [isOutOfStock, onPress, scaleAnim]);

  const stockColor = isOutOfStock
    ? tokens.colors.coral
    : isLowStock
    ? tokens.colors.amber
    : tokens.colors.sage;

  const gradientColors: [string, string] = isOutOfStock
    ? ['rgba(100,100,100,0.12)', tokens.colors.surface]
    : ['rgba(184,123,90,0.1)', tokens.colors.surface];

  if (compact) {
    // Tablet grid mode: vertical card
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={[styles.cardContainer, isOutOfStock && styles.containerDisabled]}
          onPress={handlePress}
          activeOpacity={0.85}
          disabled={isOutOfStock}
        >
          {/* Image or placeholder */}
          <View style={styles.cardImageWrapper}>
            {product.image_url ? (
              <Image source={{ uri: product.image_url }} style={styles.cardImage} />
            ) : (
              <View style={styles.cardPlaceholder}>
                <Text style={[styles.placeholderText, isOutOfStock && styles.placeholderTextDisabled]}>
                  {product.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={[styles.stockBadge, { backgroundColor: `${stockColor}22` }]}>
              <Text style={[styles.stockText, { color: stockColor }]}>
                {isOutOfStock ? '×' : product.stock_quantity}
              </Text>
            </View>
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardName, isOutOfStock && styles.nameDisabled]} numberOfLines={2}>
              {product.name}
            </Text>
            <Text style={[styles.cardPrice, isOutOfStock && styles.priceDisabled]}>
              ${product.price.toFixed(2)}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Mobile list mode: horizontal row
  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.container, isOutOfStock && styles.containerDisabled]}
        onPress={handlePress}
        activeOpacity={0.85}
        accessibilityLabel={`${product.name}, $${product.price.toFixed(2)}, ${product.stock_quantity} en stock`}
        accessibilityRole="button"
        disabled={isOutOfStock}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Left — image or placeholder */}
        <View style={styles.imageWrapper}>
          {product.image_url ? (
            <Image source={{ uri: product.image_url }} style={styles.image} />
          ) : (
            <View style={styles.placeholder}>
              <LinearGradient
                colors={
                  isOutOfStock
                    ? ['rgba(100,100,100,0.2)', 'rgba(100,100,100,0.08)']
                    : ['rgba(184,123,90,0.25)', 'rgba(184,123,90,0.08)']
                }
                style={StyleSheet.absoluteFill}
              />
              <Text
                style={[
                  styles.placeholderText,
                  isOutOfStock && styles.placeholderTextDisabled,
                ]}
              >
                {product.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          {/* Stock badge — overlapping bottom-right of image */}
          <View
            style={[styles.stockBadge, { backgroundColor: `${stockColor}22` }]}
          >
            <Text style={[styles.stockText, { color: stockColor }]}>
              {isOutOfStock ? '✕' : product.stock_quantity}
            </Text>
          </View>
        </View>

        {/* Right — info */}
        <View style={styles.info}>
          <Text
            style={[styles.name, isOutOfStock && styles.nameDisabled]}
            numberOfLines={2}
          >
            {product.name}
          </Text>
          {isLowStock && !isOutOfStock && (
            <Text style={styles.lowStockLabel}>Stock bajo</Text>
          )}
        </View>

        {/* Price + add button */}
        <View style={styles.rightSection}>
          <Text
            style={[styles.price, isOutOfStock && styles.priceDisabled]}
          >
            ${product.price.toFixed(2)}
          </Text>
          {!isOutOfStock && (
            <View style={styles.addBtn}>
              <Icon name="plus" size={14} color={tokens.colors.mahogany} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export const ProductButton = memo(ProductButtonComponent, (prev, next) =>
  prev.product.id === next.product.id &&
  prev.product.name === next.product.name &&
  prev.product.price === next.product.price &&
  prev.product.stock_quantity === next.product.stock_quantity
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 10, 12, 0.45)',
    borderRadius: tokens.radius.card,
    padding: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.borderAccent,
    overflow: 'hidden',
    gap: tokens.spacing.md,
    minHeight: 76,
  },
  containerDisabled: {
    opacity: 0.45,
    borderColor: tokens.colors.border,
  },
  imageWrapper: {
    position: 'relative',
    width: 52,
    height: 52,
    borderRadius: tokens.radius.chip,
    overflow: 'hidden',
    flexShrink: 0,
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
    backgroundColor: tokens.colors.surfaceWarm,
    position: 'relative',
  },
  placeholderText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: tokens.typography['2xl'],
    fontWeight: tokens.typography.bold,
    color: tokens.colors.mahogany,
  },
  placeholderTextDisabled: {
    color: tokens.colors.textDim,
  },
  stockBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    minWidth: 20,
    height: 18,
    borderRadius: tokens.radius.xs,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  stockText: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: 9,
    fontWeight: tokens.typography.bold,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontFamily: FontNames.instrumentSans,
    fontSize: tokens.typography.base,
    fontWeight: tokens.typography.semibold,
    color: tokens.colors.text,
    lineHeight: 19,
  },
  nameDisabled: {
    color: tokens.colors.textMuted,
  },
  lowStockLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: tokens.typography.xs,
    fontWeight: tokens.typography.semibold,
    color: tokens.colors.amber,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: tokens.spacing.sm,
    flexShrink: 0,
  },
  price: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: tokens.typography.md,
    fontWeight: tokens.typography.bold,
    color: tokens.colors.mahogany,
  },
  priceDisabled: {
    color: tokens.colors.textDim,
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.mahoganyDim,
    borderWidth: 1,
    borderColor: tokens.colors.borderAccent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ─── Compact / Tablet Card (vertical) ──────────────────────────────
  cardContainer: {
    backgroundColor: 'rgba(10, 10, 12, 0.45)',
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.colors.borderAccent,
    overflow: 'hidden',
    flex: 1,
  },
  cardImageWrapper: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    backgroundColor: tokens.colors.surfaceWarm,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: tokens.colors.surfaceWarm,
  },
  cardInfo: {
    padding: tokens.spacing.md,
    gap: tokens.spacing.xs,
  },
  cardName: {
    fontFamily: FontNames.instrumentSans,
    fontSize: tokens.typography.sm,
    fontWeight: tokens.typography.semibold,
    color: tokens.colors.text,
    lineHeight: 17,
  },
  cardPrice: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: tokens.typography.base,
    fontWeight: tokens.typography.bold,
    color: tokens.colors.mahogany,
  },
});
